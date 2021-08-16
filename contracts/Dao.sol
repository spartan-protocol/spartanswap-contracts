// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iUTILS.sol";
import "./iLEND.sol"; 
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
    address public DEPLOYER;
    address public BASE;
    bool public retire;
    bool public running;

    uint256 public secondsPerEra;   // Amount of seconds per era (Inherited from BASE contract; intended to be ~1 day)
    uint256 public coolOffPeriod;   // Amount of time a proposal will need to be in finalising stage before it can be finalised
    uint256 public proposalCount;   // Count of proposals
    uint256 public majorityFactor;  // Number used to calculate majority; intended to be 6666bp === 2/3
    uint256 public erasToEarn;      // Amount of eras that make up the targeted RESERVE depletion; regulates incentives
    uint256 public daoClaim;        // The DAOVault's portion of rewards; intended to be ~10% initially
    uint256 public daoFee;          // The SPARTA fee for a user to create a new proposal, intended to be 100 SPARTA initially
    uint256 public currentProposal; // The most recent proposal; should be === proposalCount
    
    struct MemberDetails {
        bool isMember;
        uint weight;
        uint lastBlock;
        uint poolCount;
    }
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

    address[] public arrayMembers;
    address [] listedBondPools; // Only used in UI; is intended to be a historical array of all past Bond listed assets
    uint256 public bondingPeriodSeconds = 15552000; // Vesting period for bonders (6 months)
    address [] public votingAddresses;
    
    mapping(address => bool) public isMember;
    mapping(address => bool) public isListed; // Used internally to get CURRENT listed Bond assets
    mapping(address => uint256) public mapMember_lastTime;
    mapping(uint256 => uint256) public mapPID_param;
    mapping(uint256 => address) public mapPID_address;
    mapping(uint256 => string) public mapPID_type;
    mapping(uint256 => uint256) public mapPID_coolOffTime;
    mapping(uint256 => bool) public mapPID_finalising;
    mapping(uint256 => bool) public mapPID_finalised;
    mapping(uint256 => bool) public mapPID_open;
    mapping(uint256 => uint256) public mapPID_startTime;

    mapping(uint256 => mapping(address => uint256)) public mapPIDAsset_votes;
    
    event MemberDeposits(address indexed member, address indexed pool, uint256 amount);
    event MemberWithdraws(address indexed member, address indexed pool, uint256 balance);

    event NewProposal(address indexed member, uint indexed proposalID, string proposalType);
    event NewVote(address indexed member, uint indexed proposalID, uint voteWeight, uint totalVotes, string proposalType);
    event RemovedVote(address indexed member, uint indexed proposalID, uint voteWeight, uint totalVotes, string proposalType);
    event ProposalFinalising(address indexed member, uint indexed proposalID, uint timeFinalised, string proposalType);
    event CancelProposal(address indexed member, uint indexed proposalID);
    event FinalisedProposal(address indexed member, uint indexed proposalID, uint votesCast, uint totalWeight, string proposalType);
    event ListedAsset(address indexed DAO, address indexed asset);
    event DelistedAsset(address indexed DAO, address indexed asset);
    event DepositAsset(address indexed owner, uint256 depositAmount, uint256 bondedLP);

    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == DEPLOYER);
        _;
    }
    // Let the DAO Sleep
    modifier operational() {
        require(!retire, 'COMA');
        _;
    }
    // Pause proposals
    modifier isRunning() {
        require(running, 'SLEEP');
        _;
    }

    constructor (address _base){
        BASE = _base;
        DEPLOYER = msg.sender;
        DAO = address(this);
        coolOffPeriod = 259200;
        erasToEarn = 30;
        majorityFactor = 6666;
        daoClaim = 1000;
        daoFee = 100;
        proposalCount = 0;
        secondsPerEra = iBASE(BASE).secondsPerEra();
        running = false;
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
    function deposit(address pool, uint256 amount) public operational {
        require(_POOLFACTORY.isCuratedPool(pool) == true, "!curated"); // Pool must be Curated
        require(amount > 0, "!amount"); // Deposit amount must be valid
        if (isMember[msg.sender] != true) {
            arrayMembers.push(msg.sender); // If not a member; add user to member array
            isMember[msg.sender] = true; // If not a member; register the user as member
        }
        require(iBEP20(pool).transferFrom(msg.sender, address(_DAOVAULT), amount), "!funds"); // Send user's deposit to the DAOVault
        _DAOVAULT.depositLP(pool, amount, msg.sender); // Update user's deposit balance & weight
        mapMember_lastTime[msg.sender] = block.timestamp; // Reset user's last harvest time
        emit MemberDeposits(msg.sender, pool, amount);
    }
    
    // User withdraws all of their selected asset from the DAOVault
    function withdraw(address pool) external operational {
        // uint voteWeightBefore = mapPIDMember_votes[currentProposal][msg.sender]; // Get user's current vote weight
        removeVotes();
        uint256 amount = _DAOVAULT.mapMemberPool_balance(msg.sender, pool); 
        require(_DAOVAULT.withdraw(pool, msg.sender), "!transfer"); // User receives their withdrawal
        emit MemberWithdraws(msg.sender, pool, amount);
        countVotes();
        // uint voteWeightNow = countVotes(); // Users weight is updated in the current open DAO proposal
        // uint voteWeightRemoved = voteWeightBefore - voteWeightNow; // Get user's removed vote weight
        // uint _removalFee = 50 * voteWeightRemoved / 10000;
        // payFee(_removalFee); // User pays a fee to remove vote weight
    }

    //============================== REWARDS ================================//
    
    // User claims their DAOVault incentives
    function harvest() public operational {
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
        uint reward = (share * secondsSinceClaim) / secondsPerEra; // User's share times eras since they last claimed
        return reward;
    }

    // Calculate the user's current total claimable incentive
    function calcReward(address member) public view operational returns(uint){
        (uint256 weightDAO, uint256 totalDAOWeight) = _DAOVAULT.getMemberLPWeight(member);
        (uint256 weightBOND, uint256 totalBONDWeight) = _BONDVAULT.getMemberLPWeight(member);
        uint256 memberWeight = weightDAO + weightBOND;
        uint256 totalWeight = totalDAOWeight + totalBONDWeight;
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
        iBEP20(BASE).transfer(newDAO, baseBal);
    }

    // List an asset to be enabled for Bonding
    function listBondAsset(address asset) external onlyDAO {
        address _pool = _POOLFACTORY.getPool(asset);
        require(!isListed[_pool], 'listed'); // Asset must not be listed for Bond
        isListed[_pool] = true; // Register as a bond-enabled asset
        listedBondPools.push(_pool); // Add to historical record of past Bond assets
        emit ListedAsset(msg.sender, asset);
    }

    // Delist an asset from the Bond program (REFACTOR STORAGE TO MEMORY HERE FOR GAS OPT)
    function delistBondAsset(address asset) external onlyDAO {
        address _pool = _POOLFACTORY.getPool(asset);
        require(isListed[_pool], '!listed'); // Asset must be listed for Bond
        isListed[_pool] = false; // Unregister as a currently enabled asset
        for(uint i = 0; i < listedBondPools.length; i++){
            if(listedBondPools[i] == _pool){
                listedBondPools[i] = listedBondPools[listedBondPools.length - 1]; // Move the last element into the place to delete
                listedBondPools.pop(); // Remove the last element
            }
        }
        emit DelistedAsset(msg.sender, asset);
    }

    // User deposits assets to be Bonded
    function bond(address asset, uint256 amount) external payable operational nonReentrant returns (bool success) {
        require(amount > 0, '!amount'); // Amount must be valid
        require(isListed[asset], '!listed'); // Asset must be listed for Bond
        address _pool = _POOLFACTORY.getPool(asset); // Get the pool address
        if (isMember[msg.sender] != true) {
            arrayMembers.push(msg.sender); // If user is not a member; add them to the member array
            isMember[msg.sender] = true; // Register user as a member
        }
        uint256 liquidityUnits = _handleTransferIn(asset, amount); // Add liquidity and calculate LP units
        mapMember_lastTime[msg.sender] = block.timestamp; // Reset user's last harvest time
        _BONDVAULT.depositForMember(_pool, msg.sender, liquidityUnits); // Deposit the Bonded LP units in the BondVault
        emit DepositAsset(msg.sender, amount, liquidityUnits);
        return true;
    }

    // Add Bonded assets as liquidity and calculate LP units
    function _handleTransferIn(address _token, uint _amount) internal returns (uint LPunits){
        if(iBEP20(BASE).allowance(address(this), address(_ROUTER)) < 2.5 * 10**6 * 10**18){
            iBEP20(BASE).approve(address(_ROUTER), iBEP20(BASE).totalSupply()); // Increase SPARTA allowance if required
        }
        if(_token == address(0)){
            require((_amount == msg.value), "!amount");
            uint256 spartaAllocation = _UTILS.calcSwapValueInBase(_token, _amount); // Get the SPARTA swap value of the bonded assets
            LPunits = _ROUTER.addLiquidityForMember{value:_amount}(spartaAllocation, _amount, _token, address(_BONDVAULT)); // Add spartaAllocation & BNB as liquidity to mint LP tokens
        } else {
            iBEP20(_token).transferFrom(msg.sender, address(this), _amount); // Transfer user's assets to Dao contract
            uint _actualAmount = iBEP20(_token).balanceOf(address(this)); // Get actual received token amount
            uint256 spartaAllocation = _UTILS.calcSwapValueInBase(_token, _actualAmount); // Get the SPARTA swap value of the bonded assets
            if(iBEP20(_token).allowance(address(this), address(_ROUTER)) < _actualAmount){
                uint256 approvalTNK = iBEP20(_token).totalSupply();
                iBEP20(_token).approve(address(_ROUTER), approvalTNK); // Increase allowance if required
            }
            LPunits = _ROUTER.addLiquidityForMember(spartaAllocation, _actualAmount, _token, address(_BONDVAULT)); // Add spartaAllocation & assets as liquidity to mint LP tokens
        }
    }

    // User claims all of their unlocked Bonded LPs
    function claimAll(address [] memory bondAssets) external operational returns (bool){
        for(uint i = 0; i < bondAssets.length; i++){
            claim(bondAssets[i]);
        }
        return true;
    }

    // User claims unlocked Bond units of a selected asset
    function claim(address asset) public operational returns (bool){
        uint claimA = calcClaimBondedLP(msg.sender, asset); // Check user's unlocked Bonded LPs
        if(claimA > 0){
            removeVotes();
            _BONDVAULT.claimForMember(asset, msg.sender); // Claim LPs if any unlocked
            countVotes();
        }
        return true;
    }
    
    // Calculate user's unlocked Bond units of a selected asset
    function calcClaimBondedLP(address bondedMember, address asset) public view returns (uint){
        uint claimAmount = _BONDVAULT.calcBondedLP(bondedMember, asset); // Check user's unlocked Bonded LPs
        return claimAmount;
    }

    //============================== CREATE PROPOSALS ================================//

    // New ID, but specify type, one type for each function call
    // Votes counted to IDs
    // IDs are finalised
    // IDs are executed, but type specifies unique logic

    // New DAO proposal: Simple action
    function newActionProposal(string memory typeStr) external returns(uint) {
        bytes memory _type = bytes(typeStr); // Get the proposal type
        require(isEqual(_type, 'FLIP_EMISSIONS') || isEqual(_type, 'GET_SPARTA'), '!TYPE');
        checkProposal(); // If no open proposal; construct new one
        payFee(daoFee * 10**18); // Pay SPARTA fee for new proposal
        mapPID_type[currentProposal] = typeStr; // Set the proposal type
        emit NewProposal(msg.sender, currentProposal, typeStr);
        return currentProposal;
    }

    // New DAO proposal: uint parameter
    function newParamProposal(uint256 param, string memory typeStr) external returns(uint) {
        require(param > 0, "!param"); // Param must be valid
        bytes memory _type = bytes(typeStr); // Get the proposal type
        require(isEqual(_type, 'COOL_OFF') || isEqual(_type, 'ERAS_TO_EARN'), '!TYPE');
        checkProposal(); // If no open proposal; construct new one
        payFee(daoFee * 10**18); // Pay SPARTA fee for new proposal
        mapPID_param[currentProposal] = param; // Set the proposed parameter
        mapPID_type[currentProposal] = typeStr; // Set the proposal type
        emit NewProposal(msg.sender, currentProposal, typeStr);
        return currentProposal;
    }

    // New DAO proposal: Address parameter
    function newAddressProposal(address proposedAddress, string memory typeStr) external returns(uint) {
        bytes memory _type = bytes(typeStr); // Get the proposal type
        address _pool = _POOLFACTORY.getPool(proposedAddress);
        if (isEqual(_type, 'DAO') || isEqual(_type, 'ROUTER') || isEqual(_type, 'UTILS') || isEqual(_type, 'RESERVE')) {
            require(proposedAddress != address(0), "!address"); // Proposed address must be valid
        } else if (isEqual(_type, 'LIST_BOND') || isEqual(_type, 'REMOVE_CURATED_POOL')) {
            require(_POOLFACTORY.isCuratedPool(_pool), '!CURATED');
        } else {
            require(isEqual(_type, 'DELIST_BOND') || isEqual(_type, 'ADD_CURATED_POOL'), '!TYPE');
            require(_pool != address(0), '!CURATED');
        }
        checkProposal(); // If no open proposal; construct new one
        payFee(daoFee * 10**18); // Pay SPARTA fee for new proposal
        mapPID_address[currentProposal] = proposedAddress; // Set the proposed new address
        mapPID_type[currentProposal] = typeStr; // Set the proposal type
        emit NewProposal(msg.sender, currentProposal, typeStr);
        return currentProposal;
    }

    // New DAO proposal: Grant SPARTA to wallet
    function newGrantProposal(address recipient, uint amount) external returns(uint) {
        require(recipient != address(0), "!address"); // Proposed recipient must be valid
        uint reserve = iBEP20(BASE).balanceOf(address(_RESERVE)); // Get total BASE balance of RESERVE
        uint daoReward = (reserve * daoClaim) / 10000; // Get DAO's share of BASE balance of RESERVE (max user claim amount)
        require((amount > 0) && (amount < daoReward), "!AMOUNT"); // Proposed grant amount must be valid
        checkProposal(); // If no open proposal; construct new one
        payFee(daoFee * 10**18); // Pay SPARTA fee for new proposal
        string memory typeStr = "GRANT";
        mapPID_type[currentProposal] = typeStr; // Set the proposal type
        mapPID_address[currentProposal] = recipient; // Set the proposed grant recipient
        mapPID_param[currentProposal] = amount; // Set the proposed grant amount
        emit NewProposal(msg.sender, currentProposal, typeStr);
        return currentProposal;
    }

    // If no existing open DAO proposal; register a new one
    function checkProposal() internal operational isRunning {
        require(_RESERVE.globalFreeze() != true, '');
        require(mapPID_open[currentProposal] == false, '!open'); // There must not be an existing open proposal
        proposalCount += 1; // Increase proposal count
        currentProposal = proposalCount; // Set current proposal to the new count
        mapPID_open[currentProposal] = true; // Set new proposal as open status
        mapPID_startTime[currentProposal] = block.timestamp; // Set the start time of the proposal to now
    }
    
    // Pay a DAO fee
    function payFee(uint amount) internal returns(bool){
        if (amount >= 10**18) {
            require(iBEP20(BASE).transferFrom(msg.sender, address(_RESERVE), amount), '!fee'); // User pays the DAO fee
        }
        return true;
    } 

    //============================== VOTE && FINALISE ================================//

    // Vote for a proposal
    function voteProposal() external operational returns (uint voteWeight) {
        require(_RESERVE.globalFreeze() != true, '');
        require(mapPID_open[currentProposal] == true, "!open"); // Proposal must be open status
        bytes memory _type = bytes(mapPID_type[currentProposal]); // Get the proposal type
        countVotes(); // Vote for proposal and recount
        if(hasQuorum(currentProposal) && mapPID_finalising[currentProposal] == false){
            if(isEqual(_type, 'DAO') || isEqual(_type, 'UTILS') || isEqual(_type, 'RESERVE') || isEqual(_type, 'GET_SPARTA') || isEqual(_type, 'ROUTER') || isEqual(_type, 'LIST_BOND') || isEqual(_type, 'GRANT') || isEqual(_type, 'ADD_CURATED_POOL')){
                if(hasMajority(currentProposal)){
                    _finalise(); // Critical proposals require 'majority' consensus to enter finalization phase
                }
            } else {
                _finalise(); // Other proposals require 'quorum' consensus to enter finalization phase
            }
        }
        // if(voteWeight > 0){
        //     emit NewVote(msg.sender, currentProposal, voteWeight, mapPID_votes[currentProposal], string(_type));
        // }
    }

    // Remove vote from a proposal
    function removeVote() public operational returns (uint voteWeightRemoved){
        bytes memory _type = bytes(mapPID_type[currentProposal]); // Get the proposal type
        if(mapPID_open[currentProposal]){
           removeVotes();
        }
        // uint _removalFee = 50 * voteWeightRemoved / 10000;
        // payFee(_removalFee); // User pays a fee to remove vote weight
        // emit RemovedVote(msg.sender, currentProposal, voteWeightRemoved, mapPID_votes[currentProposal], string(_type));
        // return voteWeightRemoved;
    }

    // Push the proposal into 'finalising' status
    function _finalise() internal {
        bytes memory _type = bytes(mapPID_type[currentProposal]); // Get the proposal type
        mapPID_finalising[currentProposal] = true; // Set finalising status to true
        mapPID_coolOffTime[currentProposal] = block.timestamp; // Set timestamp to calc cooloff time from
        emit ProposalFinalising(msg.sender, currentProposal, block.timestamp+coolOffPeriod, string(_type));
    }

    // Attempt to cancel the open proposal
    function cancelProposal() operational external {
        require(block.timestamp > (mapPID_startTime[currentProposal] + 1296000), "!days"); // Proposal must not be new
        address [] memory votingAssets =  _POOLFACTORY.vaultAssets();
        for(uint i =0; i < votingAssets.length; i++){
           mapPIDAsset_votes[currentProposal][votingAssets[i]] = 0;
        }
        mapPID_open[currentProposal] = false; // Set the proposal as not open (closed status)
        emit CancelProposal(msg.sender, currentProposal);
    }

    // A finalising-stage proposal can be finalised after the cool off period
    function finaliseProposal() external operational isRunning {
        require(_RESERVE.globalFreeze() != true, '');
        require((block.timestamp - mapPID_coolOffTime[currentProposal]) > coolOffPeriod, "!cooloff"); // Must be past cooloff period
        require(mapPID_finalising[currentProposal] == true, "!finalising"); // Must be in finalising stage
        require(mapPID_open[currentProposal] == true);
        require(mapPID_finalised[currentProposal] == false);
        if(!hasQuorum(currentProposal)){
            mapPID_finalising[currentProposal] = false; // If proposal has lost quorum consensus; kick it out of the finalising stage
        } else {
            bytes memory _type = bytes(mapPID_type[currentProposal]); // Get the proposal type
            if(isEqual(_type, 'DAO')){
                moveDao(currentProposal);
            } else if (isEqual(_type, 'ROUTER')) {
                moveRouter(currentProposal);
            } else if (isEqual(_type, 'UTILS')){
                moveUtils(currentProposal);
            } else if (isEqual(_type, 'RESERVE')){
                moveReserve(currentProposal);
            } else if (isEqual(_type, 'FLIP_EMISSIONS')){
                flipEmissions(currentProposal);
            } else if (isEqual(_type, 'COOL_OFF')){
                changeCooloff(currentProposal);
            } else if (isEqual(_type, 'ERAS_TO_EARN')){
                changeEras(currentProposal);
            } else if (isEqual(_type, 'GRANT')){
                grantFunds(currentProposal);
            } else if (isEqual(_type, 'GET_SPARTA')){
                _increaseSpartaAllocation(currentProposal);
            } else if (isEqual(_type, 'LIST_BOND')){
                _listBondingAsset(currentProposal);
            } else if (isEqual(_type, 'DELIST_BOND')){
                _delistBondingAsset(currentProposal);
            } else if (isEqual(_type, 'ADD_CURATED_POOL')){
                _addCuratedPool(currentProposal);
            } else if (isEqual(_type, 'REMOVE_CURATED_POOL')){
                _removeCuratedPool(currentProposal);
            } else {
                completeProposal(currentProposal); // If no match; close proposal
            }
        }
    }

    // Change the DAO to a new contract address
    function moveDao(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new address
        DAO = _proposedAddress; // Change the DAO to point to the new DAO address
        iBASE(BASE).changeDAO(_proposedAddress); // Change the BASE contract to point to the new DAO address
        daoHasMoved = true; // Set status of this old DAO
        completeProposal(_proposalID); // Finalise the proposal
    }

    // Change the ROUTER to a new contract address
    function moveRouter(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new address
        _ROUTER = iROUTER(_proposedAddress); // Change the DAO to point to the new ROUTER address
        completeProposal(_proposalID); // Finalise the proposal
    }

    // Change the UTILS to a new contract address
    function moveUtils(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new address
        _UTILS = iUTILS(_proposedAddress); // Change the DAO to point to the new UTILS address
        completeProposal(_proposalID); // Finalise the proposal
    }

    // Change the RESERVE to a new contract address
    function moveReserve(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new address
        _RESERVE = iRESERVE(_proposedAddress); // Change the DAO to point to the new RESERVE address
        completeProposal(_proposalID); // Finalise the proposal
    }

    // Flip the BASE emissions on/off
    function flipEmissions(uint _proposalID) internal {
        iBASE(BASE).flipEmissions(); // Toggle emissions on the BASE contract
        completeProposal(_proposalID); // Finalise the proposal
    }

    // Change cool off period (Period of time until a finalising proposal can be finalised)
    function changeCooloff(uint _proposalID) internal {
        uint256 _proposedParam = mapPID_param[_proposalID]; // Get the proposed new param
        coolOffPeriod = _proposedParam; // Change coolOffPeriod
        completeProposal(_proposalID); // Finalise the proposal
    }

    // Change erasToEarn (Used to regulate the incentives flow)
    function changeEras(uint _proposalID) internal {
        uint256 _proposedParam = mapPID_param[_proposalID]; // Get the proposed new param
        erasToEarn = _proposedParam; // Change erasToEarn
        completeProposal(_proposalID); // Finalise the proposal
    }

    // Grant SPARTA to the proposed recipient
    function grantFunds(uint _proposalID) internal {
        uint256 _proposedAmount = mapPID_param[_proposalID]; // Get the proposed SPARTA grant amount
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed SPARTA grant recipient
        _RESERVE.grantFunds(_proposedAmount, _proposedAddress); // Grant the funds to the recipient
        completeProposal(_proposalID); // Finalise the proposal
    }

    // Mint a 2.5M SPARTA allocation for the Bond program
    function _increaseSpartaAllocation(uint _proposalID) internal {
        uint256 _2point5m = 2.5*10**6*10**18; //_2.5m
        iBASE(BASE).mintFromDAO(_2point5m, address(this)); // Mint SPARTA and send to DAO to hold
        completeProposal(_proposalID); // Finalise the proposal
    }

    // List an asset to be enabled for Bonding
    function _listBondingAsset(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new asset
        if(!isListed[_proposedAddress]){
            isListed[_proposedAddress] = true; // Register asset as listed for Bond
            listedBondPools.push(_proposedAddress); // Add asset to array of listed Bond assets
        }
        completeProposal(_proposalID); // Finalise the proposal
    }

    // Delist an asset from being allowed to Bond
    function _delistBondingAsset(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new asset
        if(isListed[_proposedAddress]){
            isListed[_proposedAddress] = false; // Unregister asset as listed for Bond (Keep it in the array though; as this is used in the UI)
            for(uint i = 0; i < listedBondPools.length; i++){
                if(listedBondPools[i] == _proposedAddress){
                    listedBondPools[i] = listedBondPools[listedBondPools.length - 1]; // Move the last element into the place to delete
                    listedBondPools.pop(); // Remove the last element
                }
            }
        }
        completeProposal(_proposalID); // Finalise the proposal
    }

    // Add a pool as 'Curated' to enable synths, weight and incentives
    function _addCuratedPool(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed new asset
        _POOLFACTORY.addCuratedPool(_proposedAddress); // Add the pool as Curated
        completeProposal(_proposalID); // Finalise the proposal
    }

    // Remove a pool from Curated status
    function _removeCuratedPool(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID]; // Get the proposed asset for removal
        _POOLFACTORY.removeCuratedPool(_proposedAddress); // Remove pool as Curated
        if (isListed[_proposedAddress]) {
            isListed[_proposedAddress] = false;
        }
        completeProposal(_proposalID); // Finalise the proposal
    }
    
    // After completing the proposal's action; close it
    function completeProposal(uint _proposalID) internal {
        string memory _typeStr = mapPID_type[_proposalID]; // Get proposal type
        // emit FinalisedProposal(msg.sender, _proposalID, mapPID_votes[_proposalID], _DAOVAULT.totalWeight() + _BONDVAULT.totalWeight(), _typeStr);
        address [] memory votingAssets =  _POOLFACTORY.vaultAssets();
        for(uint i =0; i < votingAssets.length; i++){
           mapPIDAsset_votes[_proposalID][votingAssets[i]] = 0;
        }
        mapPID_finalised[_proposalID] = true; // Finalise the proposal
        mapPID_finalising[_proposalID] = false; // Remove proposal from 'finalising' stage
        mapPID_open[_proposalID] = false; // Close the proposal
    }

    //============================== CONSENSUS ================================//
    
    // Add user's total weight to proposal and recount
    function countVotes() internal {
        address [] memory votingAssets =  _POOLFACTORY.vaultAssets();
        for(uint i =0; i < votingAssets.length; i++){
            mapPIDAsset_votes[currentProposal][votingAssets[i]] +=  _DAOVAULT.mapMemberPool_balance(votingAssets[i], msg.sender) + _BONDVAULT.getMemberPoolBalance(votingAssets[i], msg.sender);
        }
    }

    function removeVotes() internal {
        address [] memory votingAssets =  _POOLFACTORY.vaultAssets();
        for(uint i =0; i < votingAssets.length; i++){
            mapPIDAsset_votes[currentProposal][votingAssets[i]] -=  _DAOVAULT.mapMemberPool_balance(votingAssets[i], msg.sender) + _BONDVAULT.getMemberPoolBalance(votingAssets[i], msg.sender);
        }
    }

    // Check if a proposal has Majority consensus
    function hasMajority(uint _proposalID) public view returns(bool){
        address [] memory votingAssets =  _POOLFACTORY.vaultAssets();
         uint256 _votedWeight; uint _totalWeight;
        for(uint i =0; i < votingAssets.length; i++){
            uint256 lpTotal = _DAOVAULT.mapTotalPool_balance(votingAssets[i]) + _BONDVAULT.mapTotalPool_balance(votingAssets[i]);
            _votedWeight += _UTILS.getPoolShareWeight(votingAssets[i], mapPIDAsset_votes[_proposalID][votingAssets[i]]); // Get user's current weight
            _totalWeight += _UTILS.getPoolShareWeight(votingAssets[i], lpTotal); // Get user's current weight
        }
        uint consensus = _totalWeight * majorityFactor / 10000; // Majority > 66.6%
        return (_votedWeight > consensus);
    }

    // Check if a proposal has Quorum consensus
    function hasQuorum(uint _proposalID) public view returns(bool){
         address [] memory votingAssets =  _POOLFACTORY.vaultAssets();
         uint256 _votedWeight; uint _totalWeight;
        for(uint i =0; i < votingAssets.length; i++){
            uint256 lpTotal = _DAOVAULT.mapTotalPool_balance(votingAssets[i]) + _BONDVAULT.mapTotalPool_balance(votingAssets[i]);
            _votedWeight += _UTILS.getPoolShareWeight(votingAssets[i], mapPIDAsset_votes[_proposalID][votingAssets[i]]); // Get user's current weight
            _totalWeight += _UTILS.getPoolShareWeight(votingAssets[i],lpTotal); // Get user's current weight
        }
        uint consensus = _totalWeight / 2; // Quorum > 50%
        return (_votedWeight > consensus);
    }

    //======================================PROTOCOL CONTRACTs GETTER=================================//
    
    // Get the ROUTER address that the DAO currently points to
    function ROUTER() public view returns(iROUTER){
        if(daoHasMoved){
            return Dao(DAO).ROUTER();
        } else {
            return _ROUTER;
        }
    }

    // Get the UTILS address that the DAO currently points to
    function UTILS() public view returns(iUTILS){
        if(daoHasMoved){
            return Dao(DAO).UTILS();
        } else {
            return _UTILS;
        }
    }

    // Get the BONDVAULT address that the DAO currently points to
    function BONDVAULT() public view returns(iBONDVAULT){
        if(daoHasMoved){
            return Dao(DAO).BONDVAULT();
        } else {
            return _BONDVAULT;
        }
    }

    // Get the DAOVAULT address that the DAO currently points to
    function DAOVAULT() public view returns(iDAOVAULT){
        if(daoHasMoved){
            return Dao(DAO).DAOVAULT();
        } else {
            return _DAOVAULT;
        }
    }

    // Get the POOLFACTORY address that the DAO currently points to
    function POOLFACTORY() public view returns(iPOOLFACTORY){
        if(daoHasMoved){
            return Dao(DAO).POOLFACTORY();
        } else {
            return _POOLFACTORY;
        }
    }

    // Get the SYNTHFACTORY address that the DAO currently points to
    function SYNTHFACTORY() public view returns(iSYNTHFACTORY){
        if(daoHasMoved){
            return Dao(DAO).SYNTHFACTORY();
        } else {
            return _SYNTHFACTORY;
        }
    }

    // Get the RESERVE address that the DAO currently points to
    function RESERVE() public view returns(iRESERVE){
        if(daoHasMoved){
            return Dao(DAO).RESERVE();
        } else {
            return _RESERVE;
        }
    }

    // Get the SYNTHVAULT address that the DAO currently points to
    function SYNTHVAULT() public view returns(iSYNTHVAULT){
        if(daoHasMoved){
            return Dao(DAO).SYNTHVAULT();
        } else {
            return _SYNTHVAULT;
        }
    }
    // Get the LEND address that the DAO currently points to
    function LEND() public view returns(iLEND){
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


   