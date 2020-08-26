// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

interface iERC20 {
    function balanceOf(address account) external view returns (uint);
    function transfer(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
}
interface iROUTER {
    function isPool(address) external view returns(bool);
}
interface iPOOL {
    function TOKEN() external view returns(address);
    function transferTo(address, uint) external returns (bool);
}
interface iUTILS {
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    function getPoolShare(address token, uint units) external view returns(uint baseAmt);
}
interface iBASE {
    function changeIncentiveAddress(address) external returns(bool);
    function changeDAO(address) external returns(bool);
}

// SafeMath
library SafeMath {

    function add(uint a, uint b) internal pure returns (uint)   {
        uint c = a + b;
        assert(c >= a);
        return c;
    }

    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) {
            return 0;
        }
        uint c = a * b;
        require(c / a == b, "SafeMath");
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath");
    }
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath");
    }
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        return c;
    }
}


contract Dao {

    using SafeMath for uint;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    address public DEPLOYER;

    iUTILS public UTILS;
    address public BASE;

    uint256 public totalWeight;
    uint public one = 10**18;
    uint public coolOffPeriod = 1 * 2;
    uint public blocksPerDay = 5760;
    uint public daysToEarnFactor = 10;

    address public proposedRouter;
    bool public proposedRouterChange;
    uint public routerChangeStart;
    bool public routerHasMoved;
    address private _router;

    address public proposedDao;
    bool public proposedDaoChange;
    uint public daoChangeStart;
    bool public daoHasMoved;
    address public DAO;

    address[] public arrayMembers;
    mapping(address => bool) public isMember; // Is Member
    mapping(address => mapping(address => uint256)) public mapMemberPool_Balance; // Member's balance in pool
    mapping(address => uint256) public mapMember_Weight; // Value of weight
    mapping(address => mapping(address => uint256)) public mapMemberPool_Weight; // Value of weight for pool
    mapping(address => uint256) public mapMember_Block;

    mapping(address => uint256) public mapAddress_Votes; // Value of weight
    mapping(address => mapping(address => uint256)) public mapAddressMember_Votes; // Value of weight

    event MemberLocks(address indexed member,address indexed pool,uint256 amount);
    event MemberUnlocks(address indexed member,address indexed pool,uint256 balance);
    event MemberRegisters(address indexed member,address indexed pool,uint256 amount);
    event NewVote(address indexed member,address indexed proposedAddress, uint voteWeight, uint totalVotes, string proposalType);
    event ProposalFinalising(address indexed member,address indexed proposedAddress, uint timeFinalised, string proposalType);
    event NewAddress(address indexed member,address indexed newAddress, uint votesCast, uint totalWeight, string proposalType);

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
    // Only Deployer can execute
    modifier onlyDeployer() {
        require(msg.sender == DEPLOYER, "DeployerErr");
        _;
    }

    constructor (address _base, address _utils) public payable {
        BASE = _base;
        UTILS = iUTILS(_utils);
        DEPLOYER = msg.sender;
        _status = _NOT_ENTERED;
    }
    function setGenesisRouter(address genesisRouter) public onlyDeployer {
        _router = genesisRouter;
    }
    function purgeDeployer() public onlyDeployer {
        DEPLOYER = address(0);
    }

    //============================== USER - LOCK/UNLOCK ================================//
    // Member locks some LP tokens
    function lock(address pool, uint256 amount) public nonReentrant {
        require(iROUTER(_router).isPool(pool) == true, "Must be listed");
        require(amount > 0, "Must get some");
        if (!isMember[msg.sender]) {
            mapMember_Block[msg.sender] = block.number;
            arrayMembers.push(msg.sender);
            isMember[msg.sender] = true;
        }
        require(iPOOL(pool).transferTo(address(this), amount),"Must transfer"); // Uni/Bal LP tokens return bool
        mapMemberPool_Balance[msg.sender][pool] = mapMemberPool_Balance[msg.sender][pool].add(amount); // Record total pool balance for member
        registerWeight(msg.sender, pool); // Register weight
        emit MemberLocks(msg.sender, pool, amount);
    }

    // Member unlocks all from a pool
    function unlock(address pool) public nonReentrant {
        uint256 balance = mapMemberPool_Balance[msg.sender][pool];
        require(balance > 0, "Must have a balance to weight");
        reduceWeight(pool, msg.sender);
        if(mapMember_Weight[msg.sender] == 0 && iERC20(BASE).balanceOf(address(this)) > 0){
            harvest();
        }
        require(iERC20(pool).transfer(msg.sender, balance), "Must transfer"); // Then transfer
        emit MemberUnlocks(msg.sender, pool, balance);
    }

    // Member registers weight in a single pool
    function registerWeight(address member, address pool) internal {
        uint weight = updateWeight(pool, member);
        emit MemberRegisters(member, pool, weight);
    }

    function updateWeight(address pool, address member) public returns(uint){
        if(mapMemberPool_Weight[member][pool] > 0){
            totalWeight = totalWeight.sub(mapMemberPool_Weight[member][pool]); // Remove previous weights
            mapMember_Weight[member] = mapMember_Weight[member].sub(mapMemberPool_Weight[member][pool]);
            mapMemberPool_Weight[member][pool] = 0;
        }
        uint weight = UTILS.getPoolShare(iPOOL(pool).TOKEN(), mapMemberPool_Balance[msg.sender][pool] );
        mapMemberPool_Weight[member][pool] = weight;
        mapMember_Weight[member] += weight;
        totalWeight += weight;
        return weight;
    }
    function reduceWeight(address pool, address member) internal {
        uint weight = mapMemberPool_Weight[member][pool];
        mapMemberPool_Balance[member][pool] = 0; // Zero out balance
        mapMemberPool_Weight[member][pool] = 0; // Zero out weight
        totalWeight = totalWeight.sub(weight); // Remove that weight
        mapMember_Weight[member] = mapMember_Weight[member].sub(weight); // Reduce weight
    }

    //============================== GOVERNANCE ================================//

    // Member votes new Router
    function voteRouterChange(address router) public nonReentrant returns (uint voteWeight) {
        voteWeight = countVotes(router);
        updateRouterChange(router);
        emit NewVote(msg.sender, router, voteWeight, mapAddress_Votes[router], 'ROUTER');
    }

    function updateRouterChange(address _newRouter) internal {
        if(hasQuorum(_newRouter)){
            proposedRouter = _newRouter;
            proposedRouterChange = true;
            routerChangeStart = now;
            routerHasMoved = false;
            emit ProposalFinalising(msg.sender, _newRouter, now+coolOffPeriod, 'ROUTER');
        }
    }

    function moveRouter() public nonReentrant {
        require(proposedRouter != address(0), "No router proposed");
        require((now - routerChangeStart) > coolOffPeriod, "Must be pass cool off");
        checkRouterChange(proposedRouter);
        if(proposedRouterChange){
            _router = proposedRouter;
            routerHasMoved = true;
            emit NewAddress(msg.sender, proposedRouter, mapAddress_Votes[proposedRouter], totalWeight, 'ROUTER');
            mapAddress_Votes[proposedRouter] = 0;
            proposedRouter = address(0);
            proposedRouterChange = false;
        }
    }
    function checkRouterChange(address _newRouter) internal {
        if(!hasQuorum(_newRouter)){
            proposedRouterChange = false;
        }
    }

    // Member votes new DAO
    function voteDaoChange(address newDao) public nonReentrant returns (uint voteWeight) {
        voteWeight = countVotes(newDao);
        updateDaoChange(newDao);
        emit NewVote(msg.sender, newDao, voteWeight, mapAddress_Votes[newDao], 'DAO');
    }
    function updateDaoChange(address _newDao) internal {
        if(hasQuorum(_newDao)){
            proposedDao = _newDao;
            proposedDaoChange = true;
            daoChangeStart = now;
            emit ProposalFinalising(msg.sender, _newDao, now+coolOffPeriod, 'DAO');
        }
    }
    function moveDao() public nonReentrant{
        require(proposedDao != address(0), "No DAO proposed");
        require((now - daoChangeStart) > coolOffPeriod, "Must be pass cool off");
        checkDaoChange(proposedDao);
        if(proposedDaoChange){
            iBASE(BASE).changeIncentiveAddress(proposedDao);
            iBASE(BASE).changeDAO(proposedDao);
            uint reserve = iERC20(BASE).balanceOf(address(this));
            iERC20(BASE).transfer(proposedDao, reserve);
            daoHasMoved = true;
            DAO = proposedDao;
            emit NewAddress(msg.sender, proposedDao, mapAddress_Votes[proposedDao], totalWeight, 'DAO');
            mapAddress_Votes[proposedDao] = 0;
            proposedDao = address(0);
            proposedDaoChange = false;
        }
    }
    function checkDaoChange(address _newDao) internal {
        if(!hasQuorum(_newDao)){
            proposedDaoChange = false;
        }
    }

    function countVotes(address _address) internal returns (uint voteWeight){
        mapAddress_Votes[_address] = mapAddress_Votes[_address].sub(mapAddressMember_Votes[_address][msg.sender]);
        voteWeight = mapMember_Weight[msg.sender];
        mapAddress_Votes[_address] += voteWeight;
        mapAddressMember_Votes[_address][msg.sender] = voteWeight;
        return voteWeight;
    }

    function hasQuorum(address _address) public view returns(bool){
        uint votes = mapAddress_Votes[_address];
        uint consensus = totalWeight.div(2);
        if(votes > consensus){
            return true;
        } else {
            return false;
        }
    }

    //============================== ROUTER ================================//

    function ROUTER() public view returns(address){
        if(daoHasMoved){
            return Dao(DAO).ROUTER();
        } else {
            return _router;
        }
    }

    //============================== REWARDS ================================//
    // Rewards
    function harvest() public nonReentrant {
        uint reward = calcCurrentReward(msg.sender);
        mapMember_Block[msg.sender] = block.number;
        iERC20(BASE).transfer(msg.sender, reward);
    }

    function calcCurrentReward(address member) public view returns(uint){
        uint blocksSinceClaim = block.number.sub(mapMember_Block[member]);
        uint share = calcDailyReward(member);
        uint reward = share.mul(blocksSinceClaim).div(blocksPerDay);
        uint reserve = iERC20(BASE).balanceOf(address(this));
        if(reward >= reserve) {
            reward = reserve;
        }
        return reward;
    }

    function calcDailyReward(address member) public view returns(uint){
        uint weight = mapMember_Weight[member];
        uint reserve = iERC20(BASE).balanceOf(address(this)).div(daysToEarnFactor);
        return UTILS.calcShare(weight, totalWeight, reserve);
    }

}


   