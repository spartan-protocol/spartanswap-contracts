// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./DaoVault.sol";

import "@nomiclabs/buidler/console.sol";
interface iDAOVAULT {
    function withdraw(address, uint) external  returns (bool);
}
interface iROUTER {
    function grantFunds(uint, address) external payable returns (bool);
    function changeArrayFeeSize(uint) external returns(bool);
    function changeMaxTrades(uint) external returns(bool);
    function addLiquidity(uint, uint, address) external payable returns (uint);
}
interface iPSFACTORY {
    function isCuratedPool(address) external view returns (bool);
    function challengLowestCuratedPool(address) external view returns (bool);
    function addCuratedPool(address) external returns (bool);
    function removeCuratedPool(address) external returns (bool);
    function getPool(address token) external returns (address);
}
interface iUTILS {
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    function getPoolShareWeight(address token, uint units)external view returns(uint weight);
}
interface iPOOL {
    function TOKEN() external view returns(address);
    function transferTo(address, uint) external payable returns(bool);
    function removeLiquidityForMember(address) external returns (uint, uint);
}
interface iBOND {
    function mintBond() external payable returns (bool);
    function burnBond() external payable returns (bool);
    function listBondAsset(address) external returns (bool);
    function delistBondAsset(address) external returns (bool);
    function changeBondingPeriod(uint) external returns (bool);
    function depositInit(address, uint, address) external;
}
interface iMASTERLOAN {
    
}



contract Dao {
    using SafeMath for uint;

    address public DEPLOYER;
    address public BASE;

    uint256 public totalWeight;
    uint256 public secondsPerEra;
    uint32 public coolOffPeriod;
    uint32 public proposalCount;
    uint32 public majorityFactor;
    uint128 public erasToEarn;
    uint32 public daoClaim;
    uint32 public daoFee;
    

    struct GrantDetails{
        address recipient;
        uint amount;
    }
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
        uint timeStart;
        bool finalising;
        bool finalised;
        uint param;
        address proposedAddress;
    }

    bool public daoHasMoved;
    address public DAO;

    iROUTER private _ROUTER;
    iUTILS private _UTILS;
    iMASTERLOAN private _MASTERLOAN;
    iBOND private _BOND;
    iDAOVAULT private _DAOVAULT;
    iPSFACTORY private _PSFACTORY;

    address[] public arrayMembers;
    
    mapping(address => bool) public isMember; // Is Member
    mapping(address => mapping(address => uint256)) public mapMemberPool_balance; // Member's balance in pool
    mapping(address => uint256) public mapMember_weight; // Value of weight
    mapping(address => mapping(address => uint256)) public mapMemberPool_weight; // Value of weight for pool
    mapping(address => uint256) public mapMember_lastTime;
    mapping(address => address[]) public mapMember_poolArray;
    mapping(address => bool) public isListed;

    mapping(uint256 => uint32) public mapPID_param;
    mapping(uint256 => address) public mapPID_address;
    mapping(uint256 => GrantDetails) public mapPID_grant;
    mapping(uint256 => string) public mapPID_type;
    mapping(uint256 => uint256) public mapPID_votes;
    mapping(uint256 => uint256) public mapPID_timeStart;
    mapping(uint256 => bool) public mapPID_finalising;
    mapping(uint256 => bool) public mapPID_finalised;
    mapping(uint256 => mapping(address => uint256)) public mapPIDMember_votes;

    event MemberDeposits(address indexed member,address indexed pool,uint256 amount, uint256 weight);
    event MemberWithdraws(address indexed member,address indexed pool,uint256 balance);
    event WeightChange(address indexed member, uint256 weight, uint256 totalWeight);

    event NewProposal(address indexed member, uint indexed proposalID, string proposalType);
    event NewVote(address indexed member, uint indexed proposalID, uint voteWeight, uint totalVotes, string proposalType);
    event RemovedVote(address indexed member, uint indexed proposalID, uint voteWeight, uint totalVotes, string proposalType);
    event ProposalFinalising(address indexed member,uint indexed proposalID, uint timeFinalised, string proposalType);
    event CancelProposal(address indexed member, uint indexed oldProposalID, uint oldVotes, uint newVotes, uint totalWeight);
    event FinalisedProposal(address indexed member,uint indexed proposalID, uint votesCast, uint totalWeight, string proposalType);

    // Only Deployer can execute
     // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == DEPLOYER, "Must be DAO");
        _;
    }
    constructor (address _base) public {
        BASE = _base;
        DEPLOYER = msg.sender;
        coolOffPeriod = 1; 
        DAO = address(this);
        erasToEarn = 30;
        majorityFactor = 6666;
        daoClaim = 1000;
        daoFee = 100;
        secondsPerEra = iBASE(BASE).secondsPerEra();
        //secondsPerEra = 2;
    }
    function setGenesisAddresses(address _router, address _utils, address _masterLoan, address _bond, address _daoVault, address _psFactory) public onlyDAO {
        _ROUTER = iROUTER(_router);
        _UTILS = iUTILS(_utils);
        _MASTERLOAN = iMASTERLOAN(_masterLoan);
        _BOND = iBOND(_bond);
        _DAOVAULT = iDAOVAULT(_daoVault);
        _PSFACTORY = iPSFACTORY(_psFactory);
    }

    function setGenesisFactors(uint32 _coolOff, uint32 _daysToEarn, uint32 _majorityFactor, uint32 _daoClaim, uint32 _daoFee) public onlyDAO {
        coolOffPeriod = _coolOff;
        erasToEarn = _daysToEarn;
        majorityFactor = _majorityFactor;
        daoClaim = _daoClaim;
        daoFee = _daoFee;
    }
    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }
    //============================== USER - DEPOSIT/WITHDRAW ================================//

    // Member deposits some LP tokens
    function deposit(address pool, uint256 amount) public {
        depositLPForMember(pool, amount, msg.sender);
    }
    // Contract deposits some LP tokens for member
    function depositLPForMember(address pool, uint256 amount, address member) public {
        require(_PSFACTORY.isCuratedPool(pool) == true, "!Curated");
        require(amount > 0, "!Amount");
        if (!isMember[member]) {
            arrayMembers.push(msg.sender);
            isMember[member] = true;
        }
        require(iPOOL(pool).transferTo(address(_DAOVAULT), amount), 'sendlps');
        mapMember_lastTime[member] = now;
        mapMemberPool_balance[member][pool] = mapMemberPool_balance[member][pool].add(amount); // Record total pool balance for member
        uint weight = increaseWeight(pool, member);
        emit MemberDeposits(member, pool, amount, weight);
    }
    
    function depositForMember(address pool, uint256 amount, address member) public {
        address token = iPOOL(pool).TOKEN();//old pool
        iBEP20(pool).transfer(pool, amount);//send lps to pool
        (uint outputBase, uint outputToken) = iPOOL(pool).removeLiquidityForMember(member); 
        iBEP20(BASE).approve(address(_ROUTER), outputBase);
        iBEP20(token).approve(address(_ROUTER), outputToken);
        address newPool = _PSFACTORY.getPool(token); 
        uint lpUNits = _ROUTER.addLiquidity(outputBase, outputToken, token);
        iBEP20(newPool).approve(address(_BOND), lpUNits);
        _BOND.depositInit(newPool, lpUNits, member);
    }

    // Anyone can update a member's weight, which is their claim on the BASE in the associated pool
    function increaseWeight(address pool, address member) public returns(uint){
        require(isMember[member], "!Member");
        require(_PSFACTORY.isCuratedPool(pool) == true, "!Curated");
        if(mapMemberPool_weight[member][pool] > 0){ // Remove previous weights
            totalWeight = totalWeight.sub(mapMemberPool_weight[member][pool]);
            mapMember_weight[member] = mapMember_weight[member].sub(mapMemberPool_weight[member][pool]);
            mapMemberPool_weight[member][pool] = 0;
        } else {
            mapMember_poolArray[member].push(pool);
        }
        uint weight = _UTILS.getPoolShareWeight(iPOOL(pool).TOKEN(), mapMemberPool_balance[member][pool]); // Get claim on BASE in pool
        mapMemberPool_weight[member][pool] = weight;
        mapMember_weight[member] = mapMember_weight[member].add(weight);
        totalWeight = totalWeight.add(weight);
        emit WeightChange(member, weight, totalWeight);
        return weight;
    }

    // Member withdraws all from a pool
    function withdraw(address pool) public {
        uint256 balance = mapMemberPool_balance[msg.sender][pool];
        require(balance > 0, "!Balance");
        decreaseWeight(pool, msg.sender);
        require(_DAOVAULT.withdraw(pool, balance), "!transfer"); // Then transfer
        emit MemberWithdraws(msg.sender, pool, balance);
    }

    function decreaseWeight(address pool, address member) internal {
        uint weight = mapMemberPool_weight[member][pool];
        mapMemberPool_balance[member][pool] = 0; // Zero out balance
        mapMemberPool_weight[member][pool] = 0; // Zero out weight
        mapMember_lastTime[member] = 0; //Zero out seconds 
        totalWeight = totalWeight.sub(weight); // Remove that weight
        mapMember_weight[member] = mapMember_weight[member].sub(weight); // Reduce weight
        emit WeightChange(member, weight, totalWeight);
    }

    //============================== REWARDS ================================//
    // Rewards

    function harvest() public {
        uint reward = calcCurrentReward(msg.sender);
        mapMember_lastTime[msg.sender] = now;
        _ROUTER.grantFunds(reward, msg.sender);
    }

    function calcCurrentReward(address member) public returns(uint){
        require(isMember[member], "!member");
        uint secondsSinceClaim = now.sub(mapMember_lastTime[member]); // Get time since last claim
        uint share = calcReward(member);    // get share of rewards for member
        uint reward = share.mul(secondsSinceClaim).div(secondsPerEra);    // Get owed amount, based on per-day rates
        uint reserve = iBEP20(BASE).balanceOf(address(_ROUTER));
        uint daoReward = reserve.mul(daoClaim).div(10000);
        if(reward >= daoReward) {
            reward = daoReward; // Send full reserve if the last person
        }
        return reward;
    }

    function calcReward(address member) public returns(uint){
        updateWeight(member);
        uint weight = mapMember_weight[member];
        uint reserve = iBEP20(BASE).balanceOf(address(_ROUTER)).div(erasToEarn); // Aim to deplete reserve over a number of days
        return _UTILS.calcShare(weight, totalWeight, reserve); // Get member's share of that
    }

    function updateWeight(address member) public returns(uint){
       uint memberPool =  mapMember_poolArray[member].length;
       for(uint i = 0; i < memberPool; i++){
           increaseWeight(mapMember_poolArray[member][i], member);
       }
    }

    //============================== CREATE PROPOSALS ================================//

    // New ID, but specify type, one type for each function call
    // Votes counted to IDs
    // IDs are finalised
    // IDs are executed, but type specifies unique logic

    // Simple Action Call
    function newActionProposal(string memory typeStr) public returns(uint) {
        payFee();
        proposalCount += 1;
        mapPID_type[proposalCount] = typeStr;
        emit NewProposal(msg.sender, proposalCount, typeStr);
        return proposalCount;
    }
    // Action with uint parameter
    function newParamProposal(uint32 param, string memory typeStr) public returns(uint) {
        payFee();
        proposalCount += 1;
        mapPID_param[proposalCount] = param;
        mapPID_type[proposalCount] = typeStr;
        emit NewProposal(msg.sender, proposalCount, typeStr);
        return proposalCount;
    }
    // Action with address parameter
    function newAddressProposal(address proposedAddress, string memory typeStr) public returns(uint) {
        payFee();
        proposalCount += 1;
        mapPID_address[proposalCount] = proposedAddress;
        mapPID_type[proposalCount] = typeStr;
        emit NewProposal(msg.sender, proposalCount, typeStr);
        return proposalCount;
    }
    // Action with funding
    function newGrantProposal(address recipient, uint amount) public returns(uint) {
        payFee();
        string memory typeStr = "GRANT";
        proposalCount += 1;
        mapPID_type[proposalCount] = typeStr;
        GrantDetails memory grant;
        grant.recipient = recipient;
        grant.amount = amount;
        mapPID_grant[proposalCount] = grant;
        emit NewProposal(msg.sender, proposalCount, typeStr);
        return proposalCount;
    }
    
    function payFee() internal returns(bool){
        uint _amount = daoFee*10**18;
        require(iBASE(BASE).transferTo(address(_ROUTER), _amount), '!fee' ); 
        return true;
    } 

//============================== VOTE && FINALISE ================================//

    // Vote for a proposal
    function voteProposal(uint proposalID) public returns (uint voteWeight) {
        bytes memory _type = bytes(mapPID_type[proposalID]);
        voteWeight = countVotes(proposalID);
        if(hasQuorum(proposalID) && mapPID_finalising[proposalID] == false){
            if(isEqual(_type, 'DAO') || isEqual(_type, 'UTILS') || isEqual(_type, 'INCENTIVE')){
                if(hasMajority(proposalID)){
                    _finalise(proposalID);
                }
            } else {
                _finalise(proposalID);
            }
        }
        emit NewVote(msg.sender, proposalID, voteWeight, mapPID_votes[proposalID], string(_type));
    }

    //Remove vote from a proposal
    function _removeVote(uint proposalID) public returns (uint voteWeightRemoved){
        bytes memory _type = bytes(mapPID_type[proposalID]);
        voteWeightRemoved = mapPIDMember_votes[proposalID][msg.sender]; // get voted weight
        mapPID_votes[proposalID] -= voteWeightRemoved; //remove voteweight from totalVotingweight
        mapPIDMember_votes[proposalID][msg.sender] = 0; //zero out voting weight for member
        emit RemovedVote(msg.sender, proposalID, voteWeightRemoved, mapPID_votes[proposalID], string(_type));
        return voteWeightRemoved;
    }

    function _finalise(uint _proposalID) internal {
        bytes memory _type = bytes(mapPID_type[_proposalID]);
        mapPID_finalising[_proposalID] = true;
        mapPID_timeStart[_proposalID] = now;
        emit ProposalFinalising(msg.sender, _proposalID, now+coolOffPeriod, string(_type));
    }
    // If an existing proposal, allow a minority to cancel
    function cancelProposal(uint oldProposalID, uint newProposalID) public {
        require(mapPID_finalising[oldProposalID], "!finalising");
        require(hasMinority(newProposalID), "!minority");
        require(isEqual(bytes(mapPID_type[oldProposalID]), bytes(mapPID_type[newProposalID])), "!same");
        mapPID_votes[oldProposalID] = 0;
        emit CancelProposal(msg.sender, oldProposalID, mapPID_votes[oldProposalID], mapPID_votes[newProposalID], totalWeight);
    }

    // Proposal with quorum can finalise after cool off period
    function finaliseProposal(uint proposalID) public  {
        require((now - mapPID_timeStart[proposalID]) > coolOffPeriod, "!cool off");
        require(mapPID_finalising[proposalID] == true, "!finalising");
        if(!hasMajority(proposalID)){
            mapPID_finalising[proposalID] = false;
        }
        else {
        bytes memory _type = bytes(mapPID_type[proposalID]);
        if(isEqual(_type, 'DAO')){
            moveDao(proposalID);
        } else if (isEqual(_type, 'ROUTER')) {
            moveRouter(proposalID);
        } else if (isEqual(_type, 'UTILS')){
            moveUtils(proposalID);
        } else if (isEqual(_type, 'INCENTIVE')){
            moveIncentiveAddress(proposalID);
        } else if (isEqual(_type, 'CURVE')){
            changeCurve(proposalID);
        } else if (isEqual(_type, 'DURATION')){
            changeDuration(proposalID);
        } else if (isEqual(_type, 'START_EMISSIONS')){
            startEmissions(proposalID);
        } else if (isEqual(_type, 'STOP_EMISSIONS')){
            stopEmissions(proposalID);
        } else if (isEqual(_type, 'COOL_OFF')){
            changeCooloff(proposalID);
        } else if (isEqual(_type, 'ERAS_TO_EARN')){
            changeEras(proposalID);
        } else if (isEqual(_type, 'GRANT')){
            grantFunds(proposalID);
        } else if (isEqual(_type, 'GET_SPARTA')){
            _increaseSpartaAllocation(proposalID);
        } else if (isEqual(_type, 'LIST_BOND')){
            _listBondAsset(proposalID);
        } else if (isEqual(_type, 'DELIST_BOND')){
            _delistBondAsset(proposalID);
        } else if (isEqual(_type, 'ADD_CURATED_POOL')){
            _addCuratedPool(proposalID);
        } else if (isEqual(_type, 'REMOVE_CURATED_POOL')){
            _removeCuratedPool(proposalID);
        } else if (isEqual(_type, 'CHALLENGE_CURATED_POOL')){
            _challengLowestCuratedPool(proposalID);
        } else if (isEqual(_type, 'FEE_ARRAY_SIZE')){
            _changeArrayFeeSize(proposalID);
        } else if (isEqual(_type, 'MAX_TRADES')){
            _changeMaxTrades(proposalID);
        }
        
        }
        
    }
    function moveDao(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "No address proposed");
        DAO = mapPID_address[_proposalID];
        iBASE(BASE).changeDAO(_proposedAddress);
        uint reserve = iBEP20(BASE).balanceOf(address(this));
        iBEP20(BASE).transfer(_proposedAddress, reserve);
        daoHasMoved = true; 
        completeProposal(_proposalID);
    }
    function moveRouter(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "No address proposed");
        _ROUTER = iROUTER(_proposedAddress);
        completeProposal(_proposalID);
    }
    function moveUtils(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "No address proposed");
        _UTILS = iUTILS(_proposedAddress);
        completeProposal(_proposalID);
    }
    function moveIncentiveAddress(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "No address proposed");
        iBASE(BASE).changeIncentiveAddress(_proposedAddress);
        completeProposal(_proposalID);
    }
    function changeCurve(uint _proposalID) internal {
        uint _proposedParam = mapPID_param[_proposalID];
        require(_proposedParam != 0, "No param proposed");
        iBASE(BASE).changeEmissionCurve(_proposedParam);
        completeProposal(_proposalID);
    }
    function changeDuration(uint _proposalID) internal {
        uint _proposedParam = mapPID_param[_proposalID];
        require(_proposedParam != 0, "No param proposed");
        iBASE(BASE).changeEraDuration(_proposedParam);
        secondsPerEra = iBASE(BASE).secondsPerEra(); 
        completeProposal(_proposalID);
    }
    function startEmissions(uint _proposalID) internal {
        iBASE(BASE).startEmissions();
        completeProposal(_proposalID);
    }
    function stopEmissions(uint _proposalID) internal {
        iBASE(BASE).stopEmissions();
        completeProposal(_proposalID);
    } 
    function changeCooloff(uint _proposalID) internal {
        uint32 _proposedParam = mapPID_param[_proposalID];
        require(_proposedParam != 0, "No param proposed");
        coolOffPeriod = _proposedParam;
        completeProposal(_proposalID);
    }
    function changeEras(uint _proposalID) internal {
        uint32 _proposedParam = mapPID_param[_proposalID];
        require(_proposedParam != 0, "No param proposed");
        erasToEarn = _proposedParam;
        completeProposal(_proposalID);
    }
    function grantFunds(uint _proposalID) internal {
        GrantDetails memory _grant = mapPID_grant[_proposalID];
        _ROUTER.grantFunds(_grant.amount, _grant.recipient);
        completeProposal(_proposalID);
    }
    function _increaseSpartaAllocation(uint _proposalID) internal {
        _BOND.mintBond(); 
        _BOND.burnBond();
        completeProposal(_proposalID);
    }
    function _changeArrayFeeSize(uint _proposalID) internal {
        uint _proposedParam = mapPID_param[_proposalID];
        _ROUTER.changeArrayFeeSize(_proposedParam); 
        completeProposal(_proposalID);
    }
    function _changeMaxTrades(uint _proposalID) internal {
        uint _proposedParam = mapPID_param[_proposalID];
        _ROUTER.changeMaxTrades(_proposedParam); 
        completeProposal(_proposalID); 
    }
    function _listBondAsset(uint _proposalID) internal {
         address _proposedAddress = mapPID_address[_proposalID];
        _BOND.listBondAsset(_proposedAddress);
        completeProposal(_proposalID);
    }
    function _delistBondAsset(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "No address proposed");
        _BOND.delistBondAsset(_proposedAddress); 
        completeProposal(_proposalID);
    }
    function _addCuratedPool(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "No address proposed");
        _PSFACTORY.addCuratedPool(_proposedAddress); 
        completeProposal(_proposalID);
    }
    function _removeCuratedPool(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "No address proposed");
        _PSFACTORY.removeCuratedPool(_proposedAddress); 
        completeProposal(_proposalID);
    }
    function _challengLowestCuratedPool(uint _proposalID) internal {
         address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "No address proposed");
        _PSFACTORY.challengLowestCuratedPool(_proposedAddress); 
        completeProposal(_proposalID); 
    }
    
    function completeProposal(uint _proposalID) internal {
        string memory _typeStr = mapPID_type[_proposalID];
        emit FinalisedProposal(msg.sender, _proposalID, mapPID_votes[_proposalID], totalWeight, _typeStr);
        mapPID_votes[_proposalID] = 0;
        mapPID_finalised[_proposalID] = true;
        mapPID_finalising[_proposalID] = false;
    }

    //============================== CONSENSUS ================================//

    function countVotes(uint _proposalID) internal returns (uint voteWeight){
        mapPID_votes[_proposalID] = mapPID_votes[_proposalID].sub(mapPIDMember_votes[_proposalID][msg.sender]);
        updateWeight(msg.sender);
        voteWeight = mapMember_weight[msg.sender];
        mapPID_votes[_proposalID] += voteWeight;
        mapPIDMember_votes[_proposalID][msg.sender] = voteWeight;
        return voteWeight;
    }
    function hasMajority(uint _proposalID) public view returns(bool){
        uint votes = mapPID_votes[_proposalID];
        uint consensus = totalWeight.mul(majorityFactor).div(10000); // > 66.66%
        if(votes > consensus){
            return true;
        } else {
            return false;
        }
    }
    function hasQuorum(uint _proposalID) public view returns(bool){
        uint votes = mapPID_votes[_proposalID];
        uint consensus = totalWeight.div(3); // >33%
        if(votes > consensus){
            return true;
        } else {
            return false;
        }
    }
    function hasMinority(uint _proposalID) public view returns(bool){
        uint votes = mapPID_votes[_proposalID];
        uint consensus = totalWeight.div(6); // >16%
        if(votes > consensus){
            return true;
        } else {
            return false;
        }
    }

    //============================== ROUTER && UTILS ================================//

    function ROUTER() public view returns(iROUTER){
        if(daoHasMoved){
            return Dao(DAO).ROUTER();
        } else {
            return _ROUTER;
        }
    }
    function UTILS() public view returns(iUTILS){
        if(daoHasMoved){
            return Dao(DAO).UTILS();
        } else {
            return _UTILS;
        }
    }
    function MASTERLOAN() public view returns(iMASTERLOAN){
        if(daoHasMoved){
            return Dao(DAO).MASTERLOAN();
        } else {
            return _MASTERLOAN;
        }
    }
    function BOND() public view returns(iBOND){
        if(daoHasMoved){
            return Dao(DAO).BOND();
        } else {
            return _BOND;
        }
    }
    function DAOVAULT() public view returns(iDAOVAULT){
        if(daoHasMoved){
            return Dao(DAO).DAOVAULT();
        } else {
            return _DAOVAULT;
        }
    }
    function PSFACTORY() public view returns(iPSFACTORY){
        if(daoHasMoved){
            return Dao(DAO).PSFACTORY();
        } else {
            return _PSFACTORY;
        }
    }

    //============================== HELPERS ================================//

    function memberCount() public view returns(uint){
        return arrayMembers.length;
    }
    function getMemberDetails(address member) public view returns (MemberDetails memory memberDetails){
        memberDetails.isMember = isMember[member];
        memberDetails.weight = mapMember_weight[member];
        memberDetails.lastBlock = mapMember_lastTime[member];
        memberDetails.poolCount = mapMember_poolArray[member].length;
        return memberDetails;
    }
    function getProposalDetails(uint proposalID) public view returns (ProposalDetails memory proposalDetails){
        proposalDetails.id = proposalID;
        proposalDetails.proposalType = mapPID_type[proposalID];
        proposalDetails.votes = mapPID_votes[proposalID];
        proposalDetails.timeStart = mapPID_timeStart[proposalID];
        proposalDetails.finalising = mapPID_finalising[proposalID];
        proposalDetails.finalised = mapPID_finalised[proposalID];
        proposalDetails.param = mapPID_param[proposalID];
        proposalDetails.proposedAddress = mapPID_address[proposalID];
        return proposalDetails;
    }
    function getGrantDetails(uint proposalID) public view returns (GrantDetails memory grantDetails){
        grantDetails.recipient = mapPID_grant[proposalID].recipient;
        grantDetails.amount = mapPID_grant[proposalID].amount;
        return grantDetails;
    }
    function isEqual(bytes memory part1, bytes memory part2) public pure returns(bool){
        if(sha256(part1) == sha256(part2)){
            return true;
        } else {
            return false;
        }
    }

    function destroyMe() public onlyDAO {
         selfdestruct(msg.sender);
    }

}


   