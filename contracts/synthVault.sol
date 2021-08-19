// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBEP20.sol";
import "./iDAO.sol";
import "./iBASE.sol";
import "./iPOOL.sol";
import "./iSYNTH.sol";
import "./iUTILS.sol";
import "./iRESERVE.sol";
import "./iSYNTHFACTORY.sol";
import "./iPOOLFACTORY.sol";

contract SynthVault {
    address public immutable BASE;
    address public DEPLOYER;

    uint256 public minimumDepositTime;  // Withdrawal & Harvest lockout period; intended to be 1 hour
    uint256 public erasToEarn;          // Amount of eras that make up the targeted RESERVE depletion; regulates incentives
    uint256 public vaultClaim;          // The SynthVaults's portion of rewards; intended to be ~10% initially
    uint private lastMonth;             // Timestamp of the start of current metric period (For UI)
    uint public immutable genesis;      // Timestamp from when the synth was first deployed (For UI)

    uint256 public map30DVaultRevenue; // Tally of revenue during current incomplete metric period (for UI)
    uint256 public mapPast30DVaultRevenue; // Tally of revenue from last full metric period (for UI)
    uint256 [] public revenueArray; // Array of the last two metric periods (For UI)

    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == DEPLOYER);
        _;
    }

    constructor(address _base) {
        BASE = _base;
        DEPLOYER = msg.sender;
        erasToEarn = 30;
        minimumDepositTime = 3600; // 1 hour
        vaultClaim = 1000;
        genesis = block.timestamp;
        lastMonth = 0;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    mapping(address => mapping(address => uint256)) private mapMemberSynth_deposit;
    mapping(address => uint256) private mapTotalSynth_balance;

    mapping(address => mapping(address => uint256)) private mapMemberSynth_lastTime;
    mapping(address => uint256) private mapMember_depositTime;
    mapping(address => uint256) public lastBlock;

    event MemberDeposits(
        address indexed synth,
        address indexed member,
        uint256 newDeposit
    );
    event MemberWithdraws(
        address indexed synth,
        address indexed member,
        uint256 amount
    );
    event MemberHarvests(
        address indexed synth,
        address indexed member,
        uint256 amount
    );
    
    // Can purge deployer once DAO is stable and final
    function purgeDeployer() external onlyDAO {
        DEPLOYER = address(0);
    }

    function setParams(uint256 _erasToEarn, uint256 _minTime, uint256 _vaultClaim) external onlyDAO {
        erasToEarn = _erasToEarn;
        minimumDepositTime = _minTime;
        vaultClaim = _vaultClaim;
    }

    //====================================== DEPOSIT ========================================//

    // Contract deposits Synths in the SynthVault for user
    function deposit(address synth, uint256 amount) external {
        require(amount > 0, '!VALID'); // Must be a valid amount
        require(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(synth), '!Synth');
        require(iBEP20(synth).transferFrom(msg.sender, address(this), amount)); // Must successfuly transfer in
        _deposit(synth, msg.sender, amount); // Assess and record the deposit
    }

    // Check and record the deposit
    function _deposit(address _synth, address _member, uint256 _amount) internal {
        mapMemberSynth_lastTime[_member][_synth] = block.timestamp + minimumDepositTime; // Record deposit time (scope: member -> synth)
        mapMember_depositTime[_member] = block.timestamp + minimumDepositTime; // Record deposit time (scope: member)
        mapMemberSynth_deposit[_member][_synth] += _amount; // Record balance for member
        mapTotalSynth_balance[_synth] +=_amount;
        emit MemberDeposits(_synth, _member, _amount);
    }

    //====================================== HARVEST ========================================//

    // User harvests all of their available rewards
    function harvestAll(address [] memory synthAssets) external returns (bool) {
        for(uint i = 0; i < synthAssets.length; i++){
            harvestSingle(synthAssets[i]);
        }
        return true;
    }

    // User harvests available rewards of the chosen asset
    function harvestSingle(address synth) public returns (bool) {
        require(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(synth), '!Synth');
        uint256 reward = calcCurrentReward(synth, msg.sender); // Calc user's current SPARTA reward
        if(reward > 0){
            require((block.timestamp > mapMemberSynth_lastTime[msg.sender][synth]), 'LOCKED');  // Must not harvest before lockup period passed
            mapMemberSynth_lastTime[msg.sender][synth] = block.timestamp; // Set last harvest time as now
            address _poolOUT = iSYNTH(synth).POOL(); // Get pool address
            iPOOL(_poolOUT).sync(); // Sync here to prevent using SYNTH.transfer() to bypass lockup
            iRESERVE(_DAO().RESERVE()).grantFunds(reward, _poolOUT); // Send the SPARTA from RESERVE to POOL
            (uint synthReward,) = iPOOL(_poolOUT).mintSynth(synth, address(this)); // Mint synths & tsf to SynthVault
            mapMemberSynth_deposit[msg.sender][synth] += synthReward;
            _addVaultMetrics(reward); // Add to the revenue metrics (for UI)
            emit MemberHarvests(synth, msg.sender, reward);
        }
        return true;
    }

    // Calculate the user's current incentive-claim per era based on selected asset
    function calcCurrentReward(address synth, address member) public returns (uint256 reward){
        if (block.timestamp > mapMemberSynth_lastTime[member][synth]) {
            uint256 _secondsSinceClaim = block.timestamp - mapMemberSynth_lastTime[member][synth]; // Get seconds passed since last claim
            uint256 _share = calcReward(member); // Get member's share of RESERVE incentives
            reward = (_share * _secondsSinceClaim) / iBASE(BASE).secondsPerEra(); // User's share times eras since they last claimed
        }
        return reward;
    }

    // Calculate the user's current total claimable incentive
    function calcReward(address member) public returns (uint256) {
        (uint256 weight, uint256 totalWeight) = getMemberSynthWeight(member);
        uint256 _reserve = reserveBASE() / erasToEarn; // Aim to deplete reserve over a number of days
        uint256 _vaultReward = (_reserve * vaultClaim) / 10000; // Get the SynthVault's share of that
        return iUTILS(_DAO().UTILS()).calcShare(weight, totalWeight, _vaultReward); // Get member's share of that
    }

    // Update a member's weight 
    function getMemberSynthWeight(address member) public returns (uint256 memberSynthWeight, uint256 totalSynthWeight) {
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '');
        address [] memory vaultAssets = iPOOLFACTORY(_DAO().POOLFACTORY()).vaultAssets(); 
        for(uint i =0; i< vaultAssets.length; i++){
            address synth = iPOOL(vaultAssets[i]).SYNTH(); 
            memberSynthWeight += iUTILS(_DAO().UTILS()).calcSpotValueInBaseWithSynth(synth, mapMemberSynth_deposit[member][synth]); // Get user's current weight
            totalSynthWeight += iUTILS(_DAO().UTILS()).calcSpotValueInBaseWithSynth(synth, mapTotalSynth_balance[synth]); // Get user's current weight
        }
        return (memberSynthWeight, totalSynthWeight);
    }


    //====================================== WITHDRAW ========================================//

    // User withdraws a percentage of their synths from the vault
    function withdraw(address synth, uint256 basisPoints) external {
        require(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(synth), '!Synth');
        require(basisPoints > 0, '!VALID');
        require((block.timestamp > mapMember_depositTime[msg.sender]), "lockout"); // Must not withdraw before lockup period passed
        uint256 redeemedAmount = iUTILS(_DAO().UTILS()).calcPart(basisPoints, mapMemberSynth_deposit[msg.sender][synth]); // Calc amount to withdraw
        mapMemberSynth_deposit[msg.sender][synth] -= redeemedAmount; // Remove from user's recorded vault holdings
        mapTotalSynth_balance[synth] -= redeemedAmount;
        require(iBEP20(synth).transfer(msg.sender, redeemedAmount)); // Transfer from SynthVault to user
        emit MemberWithdraws(synth, msg.sender, redeemedAmount);
    }

  
    //================================ Helper Functions ===============================//

    function reserveBASE() public view returns (uint256) {
        return iBEP20(BASE).balanceOf(_DAO().RESERVE());
    }

    function getMemberDeposit(address synth, address member) external view returns (uint256){
        return mapMemberSynth_deposit[member][synth];
    }

    function getMemberLastTime(address member) external view returns (uint256) {
        return mapMember_depositTime[member];
    }

    function getMemberLastSynthTime(address synth, address member) external view returns (uint256){
        return mapMemberSynth_lastTime[member][synth];
    }

    //=============================== SynthVault Metrics =================================//

    function _addVaultMetrics(uint256 _fee) internal {
        if(lastMonth == 0){
            lastMonth = block.timestamp;
        }
        if(block.timestamp <= lastMonth + 2592000){ // 30 days
            map30DVaultRevenue = map30DVaultRevenue + _fee;
        } else {
            lastMonth = block.timestamp;
            mapPast30DVaultRevenue = map30DVaultRevenue;
            _addRevenue(mapPast30DVaultRevenue);
            map30DVaultRevenue = _fee;
        }
    }

    function _addRevenue(uint _totalRev) internal {
        if(!(revenueArray.length == 2)){
            revenueArray.push(_totalRev);
        } else {
            _addFee(_totalRev);
        }
    }

    function _addFee(uint _rev) internal {
        uint [] memory _revArray = revenueArray;
        uint _n = _revArray.length; // 2
        for (uint i = _n - 1; i > 0; i--) {
            _revArray[i] = _revArray[i - 1];
        }
        _revArray[0] = _rev;
        revenueArray = _revArray;
    }
}
