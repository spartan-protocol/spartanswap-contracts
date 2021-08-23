// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iUTILS.sol";
import "./iLEND.sol"; 
import "./iSYNTH.sol"; 
import "./iRESERVE.sol";
import "./iDAOVAULT.sol";
import "./iROUTER.sol";
import "./iBONDVAULT.sol";
import "./iBASE.sol"; 
import "./iBEP20.sol";
import "./iPOOLFACTORY.sol";
import "./iSYNTHFACTORY.sol";
import "./iSYNTHVAULT.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Dao is ReentrancyGuard{
    address public DEPLOYER;        // Address that deployed contract | can be purged to address(0)
    address public immutable BASE;  // SPARTA base contract address
    bool public retire;             // If DAO retired/upgraded
    bool public running;            // DAO proposals running | default to false

    uint256 public coolOffPeriod;   // Amount of time a proposal will need to be in finalising stage before it can be finalised
    uint256 public majorityFactor;  // Number used to calculate majority; intended to be 6666bp (2/3)
    uint256 public erasToEarn;      // Amount of eras that make up the targeted RESERVE depletion; regulates incentives
    uint256 public daoClaim;        // The DAOVault's portion of rewards; intended to be ~10% initially
    uint256 public daoFee;          // The SPARTA fee for a user to create a new proposal, intended to be > $200
    uint256 public currentProposal; // The most recent proposal; also acts as a count of all proposals
    
    struct ProposalDetails {
        uint id;
        string proposalType;
        uint votes;
        uint coolOffTime;
        bool finalising;
        bool finalised;
        uint param;
        address proposedAddress;
        bool open;
        uint startTime;
    }

    bool public daoHasMoved;
    address public DAO;

    iROUTER private _ROUTER;
    iUTILS private _UTILS;
    iBONDVAULT private _BONDVAULT;
    iDAOVAULT private _DAOVAULT;
    iPOOLFACTORY private _POOLFACTORY;
    iSYNTHFACTORY private _SYNTHFACTORY;
    iRESERVE private _RESERVE;
    iSYNTHVAULT private _SYNTHVAULT;
    iLEND private _LEND;

    address[] public arrayMembers; // History array of all members
    address[] public listedBondPools; // Current list of bond enabled assets
    uint256 public bondingPeriodSeconds = 15552000; // Vesting period for bonders (6 months)
    
    mapping(address => bool) public isMember;   // Used to prevent duplicates in arrayMembers[]
    mapping(address => bool) public isListed;   // Current list of bond enabled assets
    mapping(address => uint256) public mapMember_lastTime; // Member's last harvest time
    mapping(uint256 => uint256) public mapPID_param;    // Parameter mapped to the proposal
    mapping(uint256 => address) public mapPID_address;  // Address mapped to the proposal
    mapping(uint256 => string) public mapPID_type;      // String of the proposal type
    mapping(uint256 => uint256) public mapPID_coolOffTime; // Cooloff ending timestamp to be able to check if finalising proposal can be actioned
    mapping(uint256 => bool) public mapPID_finalising;  // Is proposal in the finalizing stage
    mapping(uint256 => bool) public mapPID_finalised;   // Has the proposal already be finalised / completed
    mapping(uint256 => bool) public mapPID_open;        // Is the proposal open or closed
    mapping(uint256 => uint256) public mapPID_startTime; // Timestamp of proposal creation

    mapping(uint256 => mapping(address => uint256)) private mapPIDAsset_votes; // Balance of assets staked in favour of a proposal
    mapping(uint256 => mapping(address => bool)) private mapPIDMember_hasVoted; // Whether member has signaled their support of a proposal
    
    event MemberDeposits(address indexed member, address indexed pool, uint256 amount);
    event MemberWithdraws(address indexed member, address indexed pool, uint256 balance);

    event NewProposal(address indexed member, uint indexed proposalID, string proposalType);
    event NewVote(address indexed member, uint indexed proposalID, string proposalType);
    event RemovedVote(address indexed member, uint indexed proposalID, string proposalType);
    event ProposalFinalising(address indexed member, uint indexed proposalID, uint timeFinalised, string proposalType);
    event CancelProposal(address indexed member, uint indexed proposalID);
    event FinalisedProposal(address indexed member, uint indexed proposalID, string proposalType);
    event ListedAsset(address indexed DAO, address indexed asset);
    event DelistedAsset(address indexed DAO, address indexed asset);
    event DepositAsset(address indexed owner, uint256 depositAmount, uint256 bondedLP);

    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == DEPLOYER);
        _;
    }
    // Prevent state-changing functions after DAO is retired
    modifier operational() {
        require(!retire, 'RETIRED');
        _;
    }
    // Pause proposals until running is true
    modifier isRunning() {
        require(running, 'INACTIVE');
        _;
    }
    // Is a weight changing function (Check if voter; update votes if true)
    modifier weightChange() {
        uint _currentProposal = currentProposal; // Get current proposal ID
        bool _recount = mapPID_open[_currentProposal] && mapPIDMember_hasVoted[_currentProposal][msg.sender]; // Check proposal is open and that user has already voted
        if (_recount) {
            _removeVotes(_currentProposal); // Remove user's votes from proposal before the function
        }
        _;
        if (_recount) {
            _addVotes(_currentProposal); // Add user's new votes to proposal after the function
        }
    }

    constructor (address _base){
        require(_base != address(0), '!ZERO');
        BASE = _base;
        DEPLOYER = msg.sender;
        DAO = address(this);
        coolOffPeriod = 259200; // 3 days
        erasToEarn = 30;        // 30 days
        majorityFactor = 6666;  // 66.66%
        daoClaim = 1000;        // 10%
        running = false;        // Proposals off by default
        daoFee = 400;
    }

    //==================================== PROTOCOL CONTRACTs SETTER =================================//

    function setGenesisAddresses(address _router, address _utils, address _reserve, address _lend) external onlyDAO {
        _ROUTER = iROUTER(_router);
        _UTILS = iUTILS(_utils);
        _RESERVE = iRESERVE(_reserve);
        _LEND = iLEND(_lend);
    }

    function setVaultAddresses(address _daovault, address _bondvault, address _synthVault) external onlyDAO {
        _DAOVAULT = iDAOVAULT(_daovault);
        _BONDVAULT = iBONDVAULT(_bondvault);
        _SYNTHVAULT = iSYNTHVAULT(_synthVault); 
    }
    
    function setFactoryAddresses(address _poolFactory, address _synthFactory) external onlyDAO {
        _POOLFACTORY = iPOOLFACTORY(_poolFactory);
        _SYNTHFACTORY = iSYNTHFACTORY(_synthFactory);
    }

    function setGenesisFactors(uint256 _coolOff, uint256 _erasToEarn, uint256 _majorityFactor, uint256 _daoClaim, uint256 _daoFee) external onlyDAO {
        coolOffPeriod = _coolOff;
        erasToEarn = _erasToEarn;
        majorityFactor = _majorityFactor;
        daoClaim = _daoClaim;
        daoFee = _daoFee;
    }

    // Can purge deployer once DAO is stable and final
    function purgeDeployer() external onlyDAO {
        DEPLOYER = address(0);
    }

    // Can change vesting period for bonders
    function changeBondingPeriod(uint256 bondingSeconds) external onlyDAO {
        bondingPeriodSeconds = bondingSeconds;
    }

    //============================== USER - DEPOSIT/WITHDRAW ================================//

    // Contract deposits LP tokens for member
    function deposit(address pool, uint256 amount) external operational weightChange {
        require(_POOLFACTORY.isCuratedPool(pool) == true, "!curated"); // Pool must be Curated
        require(amount > 0, "!amount");     // Deposit amount must be valid
        if (isMember[msg.sender] != true) {
            arrayMembers.push(msg.sender);  // If not a member; add user to member array
            isMember[msg.sender] = true;    // If not a member; register the user as member
        }
        require(iBEP20(pool).transferFrom(msg.sender, address(_DAOVAULT), amount), "!transfer"); // Tsf LPs (User -> DaoVault)
        _DAOVAULT.depositLP(pool, amount, msg.sender); // Update user's deposit balance
        mapMember_lastTime[msg.sender] = block.timestamp + 60; // Reset user's last harvest time + blockShift
        emit MemberDeposits(msg.sender, pool, amount);
    }
    
    // User withdraws all of their selected asset from the DAOVault
    function withdraw(address pool) external operational weightChange {
        uint256 amount = _DAOVAULT.getMemberPoolBalance(msg.sender, pool); // Get the members available vault balance
        require(_DAOVAULT.withdraw(pool, msg.sender), "!transfer"); // Withdraw assets from vault and tsf to user
        emit MemberWithdraws(msg.sender, pool, amount);
    }

    //============================== REWARDS ================================//
    
    // User claims their DAOVault incentives
    function harvest() external operational {
        require(_RESERVE.emissions(), "!emissions"); // Reserve must have emissions turned on
        uint reward = calcCurrentReward(msg.sender); // Calculate the user's claimable incentive
        mapMember_lastTime[msg.sender] = block.timestamp; // Reset user's last harvest time
        uint reserve = iBEP20(BASE).balanceOf(address(_RESERVE)); // Get total BASE balance of RESERVE
        uint daoReward = (reserve * daoClaim) / 10000; // Get DAO's share of BASE balance of RESERVE (max user claim amount)
        if(reward > daoReward){
            reward = daoReward; // User cannot claim more than the daoReward limit
        }
        _RESERVE.grantFunds(reward, msg.sender); // Send the claim to the user
    }

    // Calculate the user's current incentive-claim per era
    function calcCurrentReward(address member) public view operational returns(uint){
        uint secondsSinceClaim = block.timestamp - mapMember_lastTime[member]; // Get seconds passed since last claim
        uint share = calcReward(member); // Get share of rewards for user
        uint reward = (share * secondsSinceClaim) / iBASE(BASE).secondsPerEra(); // User's share times eras since they last claimed
        return reward;
    }

    // Calculate the user's current total claimable incentive
    function calcReward(address member) public view operational returns(uint){
        (uint256 weightDAO, uint256 totalDAOWeight) = _DAOVAULT.getMemberLPWeight(member); // Get the DAOVault weights
        (uint256 weightBOND, uint256 totalBONDWeight) = _BONDVAULT.getMemberLPWeight(member); // Get the BondVault weights
        uint256 memberWeight = weightDAO + weightBOND; // Get user's combined vault weight
        uint256 totalWeight = totalDAOWeight + totalBONDWeight; // Get vault's combined total weight
        uint reserve = iBEP20(BASE).balanceOf(address(_RESERVE)) / erasToEarn; // Aim to deplete reserve over a number of days
        uint daoReward = (reserve * daoClaim) / 10000; // Get the DAO's share of that
        return _UTILS.calcShare(memberWeight, totalWeight, daoReward); // Get users's share of that (1 era worth)
    }

    //================================ BOND Feature ==================================//

    // Can burn the SPARTA remaining in this contract (Bond allocations held in the DAO)
    function burnBalance() external onlyDAO returns (bool){
        uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
        iBASE(BASE).burn(baseBal);   
        return true;
    }

    // Can transfer the SPARTA remaining in this contract to a new DAO (If DAO is upgraded)
    function moveBASEBalance(address newDAO) external onlyDAO {
        uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
        iBEP20(BASE).transfer(newDAO, baseBal); // Tsf SPARTA (oldDao -> newDao)
    }

    // List an asset to be enabled for Bonding
    function listBondAsset(address asset) external onlyDAO {
        require(mapPID_open[currentProposal] == false, "OPEN"); // Must not be an open proposal (de-sync proposal votes)
        address _pool = _POOLFACTORY.getPool(asset); // Get the relevant pool address
        require(!isListed[_pool], 'listed'); // Asset must not be listed for Bond
        isListed[_pool] = true; // Register as a bond-enabled asset
        listedBondPools.push(_pool); // Add to record of current Bond assets
        emit ListedAsset(msg.sender, asset);
    }

    // Delist an asset from the Bond program
    function delistBondAsset(address asset) external onlyDAO {
        address _pool = _POOLFACTORY.getPool(asset); // Get the relevant pool address
        require(isListed[_pool], '!listed'); // Asset must be listed for Bond
        isListed[_pool] = false; // Unregister as a currently enabled asset
        for (uint i = 0; i < listedBondPools.length; i++) {
            if (listedBondPools[i] == _pool) {
                listedBondPools[i] = listedBondPools[listedBondPools.length - 1]; // Move the last element into the place to delete
                listedBondPools.pop(); // Remove the last element
            }
        }
        emit DelistedAsset(msg.sender, asset);
    }

    // User deposits assets to be Bonded
    function bond(address asset, uint256 amount) external payable operational weightChange returns (bool success) {
        require(amount > 0, '!amount'); // Amount must be valid
        require(isListed[asset], '!listed'); // Asset must be listed for Bond
        address _pool = _POOLFACTORY.getPool(asset); // Get the pool address
        if (isMember[msg.sender] != true) {
            arrayMembers.push(msg.sender); // If user is not a member; add them to the member array
            isMember[msg.sender] = true; // Register user as a member
        }
        uint256 liquidityUnits = _handleTransferIn(asset, amount); // Add liquidity and calculate LP units
        mapMember_lastTime[msg.sender] = block.timestamp + 60; // Reset user's last harvest time + blockShift
        _BONDVAULT.depositForMember(_pool, msg.sender, liquidityUnits); // Deposit the Bonded LP units in the BondVault
        emit DepositAsset(msg.sender, amount, liquidityUnits);
        return true;
    }

    // Add bonded assets as liquidity and calculate LP units
    function _handleTransferIn(address _token, uint _amount) internal nonReentrant returns (uint LPunits){
        if(iBEP20(BASE).allowance(address(this), address(_ROUTER)) < 2.5 * 10**6 * 10**18){
            iBEP20(BASE).approve(address(_ROUTER), iBEP20(BASE).totalSupply()); // Increase SPARTA allowance if required
        }
        if(_token == address(0)){
            require((_amount == msg.value), "!amount"); // Ensure BNB value matching
            uint256 spartaAllocation = _UTILS.calcSwapValueInBase(_token, _amount); // Get the SPARTA swap value of the bonded assets
            LPunits = _ROUTER.addLiquidityForMember{value:_amount}(spartaAllocation, _amount, _token, address(_BONDVAULT)); // Add SPARTA & BNB liquidity, mint LP tokens to BondVault
        } else {
            require(iBEP20(_token).transferFrom(msg.sender, address(this), _amount), '!transfer'); // Tsf TOKEN to (User -> Dao)
            uint _actualAmount = iBEP20(_token).balanceOf(address(this)); // Get actual received TOKEN amount
            uint256 spartaAllocation = _UTILS.calcSwapValueInBase(_token, _actualAmount); // Get the SPARTA swap value of the bonded assets
            if(iBEP20(_token).allowance(address(this), address(_ROUTER)) < _actualAmount){
                uint256 approvalTNK = iBEP20(_token).totalSupply();
                iBEP20(_token).approve(address(_ROUTER), approvalTNK); // Increase allowance if required
            }
            LPunits = _ROUTER.addLiquidityForMember(spartaAllocation, _actualAmount, _token, address(_BONDVAULT)); // Add SPARTA & TOKEN liquidity, mint LP tokens to BondVault
        }
    }

    // User claims a selection of their unlocked Bonded LPs
    function claimAll(address [] memory bondAssets) external operational weightChange returns (bool){
        for(uint i = 0; i < bondAssets.length; i++){
            _claim(bondAssets[i]);
        }
        return true;
    }

    // User claims unlocked bonded units of a selected asset (keep internal; otherwise add weightChange modifier)
    function _claim(address asset) internal operational returns (bool){
        uint claimA = calcClaimBondedLP(msg.sender, asset); // Check user's unlocked bonded LPs
        if(claimA > 0){
            _BONDVAULT.claimForMember(asset, msg.sender); // Claim LPs if any unlocked
        }
        return true;
    }
    
    // Calculate user's unlocked Bond units of a selected asset
    function calcClaimBondedLP(address bondedMember, address asset) public view returns (uint){
        uint claimAmount = _BONDVAULT.calcBondedLP(bondedMember, asset); // Check user's unlocked bonded LPs
        return claimAmount;
    }

    //============================== CREATE PROPOSALS ================================//

    // New ID, but specify type, one type for each function call
    // Votes counted to IDs
    // IDs are finalised
    // IDs are executed, but type specifies unique logic

    // New DAO proposal: Simple action
    function newActionProposal(string memory typeStr) external {
        uint _currentProposal = _checkProposal(); // If no open proposal; construct new one
        _payFee(); // Pay SPARTA fee for new proposal
        mapPID_type[_currentProposal] = typeStr; // Set the proposal type
        emit NewProposal(msg.sender, _currentProposal, typeStr);
    }

    // New DAO proposal: uint parameter
    function newParamProposal(uint256 param, string memory typeStr) external {
        require(param > 0, "!param"); // Param must be valid
        uint _currentProposal = _checkProposal(); // If no open proposal; construct new one
        _payFee(); // Pay SPARTA fee for new proposal
        mapPID_param[_currentProposal] = param; // Set the proposed parameter
        mapPID_type[_currentProposal] = typeStr; // Set the proposal type
        emit NewProposal(msg.sender, _currentProposal, typeStr);
    }

    // New DAO proposal: Address parameter
    function newAddressProposal(address proposedAddress, string memory typeStr) external {
        bytes memory _type = bytes(typeStr); // Get the proposal type
        if (isEqual(_type, 'DAO') || isEqual(_type, 'ROUTER') || isEqual(_type, 'UTILS') || isEqual(_type, 'RESERVE') || isEqual(_type, 'REALISE')) {
            require(proposedAddress != address(0), "!address"); // Proposed address must be valid
        }
        uint _currentProposal = _checkProposal(); // If no open proposal; construct new one
        _payFee(); // Pay SPARTA fee for new proposal
        mapPID_address[_currentProposal] = proposedAddress; // Set the proposed new address
        mapPID_type[_currentProposal] = typeStr; // Set the proposal type
        emit NewProposal(msg.sender, _currentProposal, typeStr);
    }

    // New DAO proposal: Grant SPARTA to wallet
    function newGrantProposal(address recipient, uint amount) external {
        require(recipient != address(0), "!address"); // Proposed recipient must be valid
        uint reserve = iBEP20(BASE).balanceOf(address(_RESERVE)); // Get total BASE balance of RESERVE
        uint daoReward = (reserve * daoClaim) / 10000; // Get DAO's share of BASE balance of RESERVE (max user claim amount)
        require((amount > 0) && (amount < daoReward), "!AMOUNT"); // Proposed grant amount must be valid
        uint _currentProposal = _checkProposal(); // If no open proposal; construct new one
        _payFee(); // Pay SPARTA fee for new proposal
        string memory typeStr = "GRANT";
        mapPID_type[_currentProposal] = typeStr; // Set the proposal type
        mapPID_address[_currentProposal] = recipient; // Set the proposed grant recipient
        mapPID_param[_currentProposal] = amount; // Set the proposed grant amount
        emit NewProposal(msg.sender, _currentProposal, typeStr);
    }

    // If no existing open DAO proposal; register a new one
    function _checkProposal() internal operational isRunning returns(uint) {
        require(_RESERVE.globalFreeze() != true, '!SAFE'); // There must not be a global freeze in place
        uint _currentProposal = currentProposal; // Get the current proposal ID
        require(mapPID_open[_currentProposal] == false, '!open'); // There must not be an existing open proposal
        _currentProposal += 1; // Increment to the new PID
        currentProposal = _currentProposal; // Set current proposal to the new count
        mapPID_open[_currentProposal] = true; // Set new proposal as open status
        mapPID_startTime[_currentProposal] = block.timestamp; // Set the start time of the proposal to now
        return _currentProposal;
    }
    
    // Pay a DAO fee
    function _payFee() internal returns(bool){
        require(iBEP20(BASE).transferFrom(msg.sender, address(_RESERVE), daoFee * 10**18), '!transfer'); // Tsf SPARTA DAO fee (User -> Reserve)
        return true;
    } 

    //============================== VOTE && FINALISE ================================//

    // Vote for a proposal
    function voteProposal() external operational {
        require(_RESERVE.globalFreeze() != true, '!SAFE'); // There must not be a global freeze in place
        uint _currentProposal = currentProposal; // Get the current proposal ID
        require(mapPID_open[_currentProposal] == true, "!open"); // Proposal must be open status
        require(mapPIDMember_hasVoted[_currentProposal][msg.sender] == false, "VOTED"); // User must not have already signaled their support
        bytes memory _type = bytes(mapPID_type[_currentProposal]); // Get the proposal type
        bool nonZero = _addVotes(_currentProposal); // Add votes to current proposal
        mapPIDMember_hasVoted[_currentProposal][msg.sender] = true; // Signal user's support for the proposal
        if (nonZero) {
            emit NewVote(msg.sender, _currentProposal, string(_type)); // Emit event if vote has nonZero weight
        }
    }

    // Remove vote from a proposal
    function unvoteProposal() external operational {
        uint _currentProposal = currentProposal; // Get the current proposal ID
        require(mapPID_open[_currentProposal] == true, "!open"); // Proposal must be open status
        require(mapPIDMember_hasVoted[_currentProposal][msg.sender] == true, "!VOTED"); // User must have already signaled their support
        bytes memory _type = bytes(mapPID_type[_currentProposal]); // Get the proposal type
        bool nonZero = _removeVotes(_currentProposal); // Remove votes from current proposal
        mapPIDMember_hasVoted[_currentProposal][msg.sender] = false; // Remove user's signal of support for the proposal
        if (nonZero) {
            emit RemovedVote(msg.sender, _currentProposal, string(_type)); // Emit event if removed votes had a nonZero weight
        }
    }

    // Poll vote weights and check if proposal is ready to go into finalisation stage
    function pollVotes() external operational {
        uint _currentProposal = currentProposal; // Get the current proposal ID
        require(mapPID_open[_currentProposal] == true, "!open"); // Proposal must be open status
        bytes memory _type = bytes(mapPID_type[_currentProposal]); // Get the proposal type
        if(hasQuorum(_currentProposal) && mapPID_finalising[_currentProposal] == false){
            if(isEqual(_type, 'DAO') || isEqual(_type, 'UTILS') || isEqual(_type, 'RESERVE') || isEqual(_type, 'GET_SPARTA') || isEqual(_type, 'ROUTER') || isEqual(_type, 'LIST_BOND') || isEqual(_type, 'GRANT') || isEqual(_type, 'ADD_CURATED_POOL')){
                if(hasMajority(_currentProposal)){
                    _finalise(_currentProposal, _type); // Critical proposals require 'majority' consensus to enter finalization phase
                }
            } else {
                _finalise(_currentProposal, _type); // Other proposals require 'quorum' consensus to enter finalization phase
            }
        }
    }

    // Push the proposal into 'finalising' status
    function _finalise(uint _currentProposal, bytes memory _type) internal {
        mapPID_finalising[_currentProposal] = true; // Set finalising status to true
        mapPID_coolOffTime[_currentProposal] = block.timestamp; // Set timestamp to calc cooloff time from
        emit ProposalFinalising(msg.sender, _currentProposal, block.timestamp+coolOffPeriod, string(_type));
    }

    // Attempt to cancel the open proposal
    function cancelProposal() operational external {
        uint _currentProposal = currentProposal; // Get the current proposal ID
        require(mapPID_open[_currentProposal], "!OPEN"); // Proposal must be open
        require(block.timestamp > (mapPID_startTime[_currentProposal] + 1296000), "!days"); // Proposal must not be new
        address [] memory votingAssets =  _POOLFACTORY.vaultAssets(); // Get array of vault-enabled pools
        for(uint i = 0; i < votingAssets.length; i++){
           mapPIDAsset_votes[_currentProposal][votingAssets[i]] = 0; // Reset votes to 0
        }
        mapPID_open[_currentProposal] = false; // Set the proposal as not open (closed status)
        emit CancelProposal(msg.sender, _currentProposal);
    }

    // A finalising-stage proposal can be finalised after the cool off period
    function finaliseProposal() external operational isRunning {
        require(_RESERVE.globalFreeze() != true, '!SAFE'); // There must not be a global freeze in place
        uint _currentProposal = currentProposal; // Get the current proposal ID
        require((block.timestamp - mapPID_coolOffTime[_currentProposal]) > coolOffPeriod, "!cooloff"); // Must be past cooloff period
        require(mapPID_finalising[_currentProposal] == true, "!finalising"); // Must be in finalising stage
        require(mapPID_open[_currentProposal] == true); // Proposal must be open
        require(mapPID_finalised[_currentProposal] == false); // Proposal must not already be finalised
        if(!hasQuorum(_currentProposal)){
            mapPID_finalising[_currentProposal] = false; // If proposal has lost quorum consensus; kick it out of the finalising stage
        } else {
            bytes memory _type = bytes(mapPID_type[_currentProposal]); // Get the proposal type
            if(isEqual(_type, 'DAO')){
                _moveDao(_currentProposal);
            } else if (isEqual(_type, 'ROUTER')) {
                _moveRouter(_currentProposal);
            } else if (isEqual(_type, 'UTILS')){
                _moveUtils(_currentProposal);
            } else if (isEqual(_type, 'RESERVE')){
                _moveReserve(_currentProposal);
            } else if (isEqual(_type, 'FLIP_EMISSIONS')){
                _flipEmissions(_currentProposal);
            } else if (isEqual(_type, 'COOL_OFF')){
                _changeCooloff(_currentProposal);
            } else if (isEqual(_type, 'ERAS_TO_EARN')){
                _changeEras(_currentProposal);
            } else if (isEqual(_type, 'GRANT')){
                _grantFunds(_currentProposal);
            } else if (isEqual(_type, 'GET_SPARTA')){
                _increaseSpartaAllocation(_currentProposal);
            } else if (isEqual(_type, 'LIST_BOND')){
                _listBondingAsset(_currentProposal);
            } else if (isEqual(_type, 'DELIST_BOND')){
                _delistBondingAsset(_currentProposal);
            } else if (isEqual(_type, 'ADD_CURATED_POOL')){
                _addCuratedPool(_currentProposal);
            } else if (isEqual(_type, 'REMOVE_CURATED_POOL')){
                _removeCuratedPool(_currentProposal);
            } else if (isEqual(_type, 'REALISE')){
                _realise(_currentProposal);
            } else {
                _completeProposal(_currentProposal); // If no match; close proposal
            }
        }
    }

    // Change the DAO to a new contract address
    function _moveDao(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new address
        DAO = _proposedAddress; // Change the DAO to point to the new DAO address
        iBASE(BASE).changeDAO(_proposedAddress); // Change the BASE contract to point to the new DAO address
        daoHasMoved = true; // Set status of this old DAO
        _completeProposal(_proposalID); // Finalise the proposal
    }

    // Change the ROUTER to a new contract address
    function _moveRouter(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new address
        _ROUTER = iROUTER(_proposedAddress); // Change the DAO to point to the new ROUTER address
        _completeProposal(_proposalID); // Finalise the proposal
    }

    // Change the UTILS to a new contract address
    function _moveUtils(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new address
        _UTILS = iUTILS(_proposedAddress); // Change the DAO to point to the new UTILS address
        _completeProposal(_proposalID); // Finalise the proposal
    }

    // Change the RESERVE to a new contract address
    function _moveReserve(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new address
        _RESERVE = iRESERVE(_proposedAddress); // Change the DAO to point to the new RESERVE address
        _completeProposal(_proposalID); // Finalise the proposal
    }

    // Flip the BASE emissions on/off
    function _flipEmissions(uint _proposalID) internal {
        iBASE(BASE).flipEmissions(); // Toggle emissions on the BASE contract
        _completeProposal(_proposalID); // Finalise the proposal
    }

    // Change cool off period (Period of time until a finalising proposal can be finalised)
    function _changeCooloff(uint _proposalID) internal {
        uint256 _proposedParam = mapPID_param[_proposalID]; // Get the proposed new param
        coolOffPeriod = _proposedParam; // Change coolOffPeriod
        _completeProposal(_proposalID); // Finalise the proposal
    }

    // Change erasToEarn (Used to regulate the incentives flow)
    function _changeEras(uint _proposalID) internal {
        uint256 _proposedParam = mapPID_param[_proposalID]; // Get the proposed new param
        erasToEarn = _proposedParam; // Change erasToEarn
        _completeProposal(_proposalID); // Finalise the proposal
    }

    // Grant SPARTA to the proposed recipient
    function _grantFunds(uint _proposalID) internal {
        uint256 _proposedAmount = mapPID_param[_proposalID]; // Get the proposed SPARTA grant amount
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed SPARTA grant recipient
        _RESERVE.grantFunds(_proposedAmount, _proposedAddress); // Grant the funds to the recipient
        _completeProposal(_proposalID); // Finalise the proposal
    }

    // Mint a 2.5M SPARTA allocation for the Bond program
    function _increaseSpartaAllocation(uint _proposalID) internal {
        uint256 _2point5m = 2.5*10**6*10**18; //_2.5m
        iBASE(BASE).mintFromDAO(_2point5m, address(this)); // Mint SPARTA and send to DAO to hold
        _completeProposal(_proposalID); // Finalise the proposal
    }

    // Realise value out of a synth's collateral
    function _realise(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed SYNTH address for realise
        iSYNTH(_proposedAddress).realise(); // Calculate value of LPs vs synthSupply; burn the premium
        _completeProposal(_proposalID); // Finalise the proposal
    }

    // List an asset to be enabled for Bonding
    function _listBondingAsset(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new asset
        if(!isListed[_proposedAddress]){
            isListed[_proposedAddress] = true; // Register asset as listed for Bond
            listedBondPools.push(_proposedAddress); // Add asset to array of listed Bond assets
        }
        _completeProposal(_proposalID); // Finalise the proposal
        emit ListedAsset(msg.sender, _proposedAddress);
        
    }

    // Delist an asset from being allowed to Bond
    function _delistBondingAsset(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new asset
        if(isListed[_proposedAddress]){
            isListed[_proposedAddress] = false; // Unregister asset as listed for Bond
            for(uint i = 0; i < listedBondPools.length; i++){
                if(listedBondPools[i] == _proposedAddress){
                    listedBondPools[i] = listedBondPools[listedBondPools.length - 1]; // Move the last element into the place to delete
                    listedBondPools.pop(); // Remove the last element
                }
            }
        }
        _completeProposal(_proposalID); // Finalise the proposal
        emit DelistedAsset(msg.sender, _proposedAddress);
    }

    // Add a pool as 'Curated' to enable synths, weight and incentives
    function _addCuratedPool(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new asset
        _POOLFACTORY.addCuratedPool(_proposedAddress); // Add the pool as Curated
        _completeProposal(_proposalID); // Finalise the proposal
    }

    // Remove a pool from Curated status
    function _removeCuratedPool(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed asset for removal
        _POOLFACTORY.removeCuratedPool(_proposedAddress); // Remove pool as Curated
        if(isListed[_proposedAddress]){
            isListed[_proposedAddress] = false; // Unregister asset as listed for Bond
            for(uint i = 0; i < listedBondPools.length; i++){
                if(listedBondPools[i] == _proposedAddress){
                    listedBondPools[i] = listedBondPools[listedBondPools.length - 1]; // Move the last element into the place to delete
                    listedBondPools.pop(); // Remove the last element
                }
            }
        }
        _completeProposal(_proposalID); // Finalise the proposal
    }
    
    // After completing the proposal's action; close it
    function _completeProposal(uint _proposalID) internal {
        string memory _typeStr = mapPID_type[_proposalID]; // Get proposal type
        address [] memory votingAssets =  _POOLFACTORY.vaultAssets(); // Get array of current vault assets
        for(uint i = 0; i < votingAssets.length; i++){
           mapPIDAsset_votes[_proposalID][votingAssets[i]] = 0; // Reset votes to 0
        }
        mapPID_finalised[_proposalID] = true; // Finalise the proposal
        mapPID_finalising[_proposalID] = false; // Remove proposal from 'finalising' stage
        mapPID_open[_proposalID] = false; // Close the proposal
        emit FinalisedProposal(msg.sender, _proposalID, _typeStr);
    }

    //============================== CONSENSUS ================================//
    
    // User stakes all their vault assets for a proposal
    function _addVotes(uint _currentProposal) internal returns (bool nonZero) {
        address [] memory votingAssets = _POOLFACTORY.vaultAssets(); // Get array of current vault assets
        for(uint i = 0; i < votingAssets.length; i++){
            uint unitsAdded = _DAOVAULT.getMemberPoolBalance(votingAssets[i], msg.sender) + _BONDVAULT.getMemberPoolBalance(votingAssets[i], msg.sender); // Get user's combined vault balance per asset
            if (unitsAdded > 0) {
                mapPIDAsset_votes[_currentProposal][votingAssets[i]] += unitsAdded; // Add user's votes for the current proposal
                nonZero = true;
            }
        }
    }

    // User removes their vault staked assets from a proposal
    function _removeVotes(uint _currentProposal) internal returns (bool nonZero) {
        address [] memory votingAssets = _POOLFACTORY.vaultAssets(); // Get array of current vault assets
        for(uint i = 0; i < votingAssets.length; i++){
            uint unitsRemoved = _DAOVAULT.getMemberPoolBalance(votingAssets[i], msg.sender) + _BONDVAULT.getMemberPoolBalance(votingAssets[i], msg.sender); // Get user's combined vault balance per asset
            if (unitsRemoved > 0) {
                mapPIDAsset_votes[_currentProposal][votingAssets[i]] -= unitsRemoved; // Remove user's votes from the current proposal
                nonZero = true;
            }
        }
    }

    // Check if a proposal has Majority consensus
    function hasMajority(uint _proposalID) public view returns(bool){
        address [] memory votingAssets = _POOLFACTORY.vaultAssets(); // Get array of current vault assets
        uint256 _votedWeight; uint _totalWeight;
        for(uint i = 0; i < votingAssets.length; i++){
            uint256 lpTotal = _DAOVAULT.mapTotalPool_balance(votingAssets[i]) + _BONDVAULT.mapTotalPool_balance(votingAssets[i]); // Get total balance of asset in the combined vaults
            _votedWeight += _UTILS.getPoolShareWeight(votingAssets[i], mapPIDAsset_votes[_proposalID][votingAssets[i]]); // Get proposal's current weight
            _totalWeight += _UTILS.getPoolShareWeight(votingAssets[i], lpTotal); // Get combined vault's current total weight
        }
        uint consensus = _totalWeight * majorityFactor / 10000; // Majority > 66.6%
        return (_votedWeight > consensus);
    }

    // Check if a proposal has Quorum consensus
    function hasQuorum(uint _proposalID) public view returns(bool){
        address [] memory votingAssets = _POOLFACTORY.vaultAssets(); // Get array of current vault assets
        uint256 _votedWeight; uint _totalWeight;
        for(uint i = 0; i < votingAssets.length; i++){
            uint256 lpTotal = _DAOVAULT.mapTotalPool_balance(votingAssets[i]) + _BONDVAULT.mapTotalPool_balance(votingAssets[i]); // Get total balance of asset in the combined vaults
            _votedWeight += _UTILS.getPoolShareWeight(votingAssets[i], mapPIDAsset_votes[_proposalID][votingAssets[i]]); // Get proposal's current weight
            _totalWeight += _UTILS.getPoolShareWeight(votingAssets[i], lpTotal); // Get combined vault's current total weight
        }
        uint consensus = _totalWeight / 2; // Quorum > 50%
        return (_votedWeight > consensus);
    }

    //======================================PROTOCOL CONTRACTs GETTER=================================//
    
    // Get the ROUTER address that the DAO currently points to
    function ROUTER() external view returns(iROUTER){
        if(daoHasMoved){
            return Dao(DAO).ROUTER();
        } else {
            return _ROUTER;
        }
    }

    // Get the UTILS address that the DAO currently points to
    function UTILS() external view returns(iUTILS){
        if(daoHasMoved){
            return Dao(DAO).UTILS();
        } else {
            return _UTILS;
        }
    }

    // Get the BONDVAULT address that the DAO currently points to
    function BONDVAULT() external view returns(iBONDVAULT){
        if(daoHasMoved){
            return Dao(DAO).BONDVAULT();
        } else {
            return _BONDVAULT;
        }
    }

    // Get the DAOVAULT address that the DAO currently points to
    function DAOVAULT() external view returns(iDAOVAULT){
        if(daoHasMoved){
            return Dao(DAO).DAOVAULT();
        } else {
            return _DAOVAULT;
        }
    }

    // Get the POOLFACTORY address that the DAO currently points to
    function POOLFACTORY() external view returns(iPOOLFACTORY){
        if(daoHasMoved){
            return Dao(DAO).POOLFACTORY();
        } else {
            return _POOLFACTORY;
        }
    }

    // Get the SYNTHFACTORY address that the DAO currently points to
    function SYNTHFACTORY() external view returns(iSYNTHFACTORY){
        if(daoHasMoved){
            return Dao(DAO).SYNTHFACTORY();
        } else {
            return _SYNTHFACTORY;
        }
    }

    // Get the RESERVE address that the DAO currently points to
    function RESERVE() external view returns(iRESERVE){
        if(daoHasMoved){
            return Dao(DAO).RESERVE();
        } else {
            return _RESERVE;
        }
    }

    // Get the SYNTHVAULT address that the DAO currently points to
    function SYNTHVAULT() external view returns(iSYNTHVAULT){
        if(daoHasMoved){
            return Dao(DAO).SYNTHVAULT();
        } else {
            return _SYNTHVAULT;
        }
    }
    // Get the LEND address that the DAO currently points to
    function LEND() external view returns(iLEND){
        if(daoHasMoved){
            return Dao(DAO).LEND();
        } else {
            return _LEND;
        }
    }

    //============================== HELPERS ================================//
    
    function memberCount() external view returns(uint){
        return arrayMembers.length;
    }

    function getProposalDetails(uint proposalID) external view returns (ProposalDetails memory proposalDetails){
        proposalDetails.id = proposalID;
        proposalDetails.proposalType = mapPID_type[proposalID];
        proposalDetails.coolOffTime = mapPID_coolOffTime[proposalID];
        proposalDetails.finalising = mapPID_finalising[proposalID];
        proposalDetails.finalised = mapPID_finalised[proposalID];
        proposalDetails.param = mapPID_param[proposalID];
        proposalDetails.proposedAddress = mapPID_address[proposalID];
        proposalDetails.open = mapPID_open[proposalID];
        proposalDetails.startTime = mapPID_startTime[proposalID];
        return proposalDetails;
    }

    function getProposalAssetVotes(uint256 proposal, address asset) public view returns (uint256) {
        return mapPIDAsset_votes[proposal][asset];
    }

    function memberVoted(uint256 proposal, address member) public view returns (bool) {
        return mapPIDMember_hasVoted[proposal][member];
    }

    function assetListedCount() external view returns (uint256 count){
        return listedBondPools.length;
    }

    function allListedAssets() external view returns (address[] memory _allListedAssets){
        return listedBondPools;
    }
    
    function isEqual(bytes memory part1, bytes memory part2) private pure returns(bool){
        return(sha256(part1) == sha256(part2));
    }

}


   