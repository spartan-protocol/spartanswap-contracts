// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

interface iERC20 {
    // function name() external view returns (string memory);
    // function symbol() external view returns (string memory);
    // function decimals() external view returns (uint);
    // function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
    function transfer(address, uint) external returns (bool);
    // function allowance(address owner, address spender) external view returns (uint);
    // function approve(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
    // event Transfer(address indexed from, address indexed to, uint value);
    // event Approval(address indexed owner, address indexed spender, uint value);
}
interface iSROUTER {
    // function totalStaked() external view returns (uint);
    // function totalVolume() external view returns (uint);
    // function totalFees() external view returns (uint);
    // function unstakeTx() external view returns (uint);
    // function stakeTx() external view returns (uint);
    // function swapTx() external view returns (uint);
    // function tokenCount() external view returns(uint);
    // function getToken(uint) external view returns(address);
    // function getPool(address) external view returns(address payable);
    function isPool(address) external view returns(bool);
    // function stakeForMember(uint inputBase, uint inputToken, address token, address member) external payable returns (uint units);
}
interface iSPOOL {
    // function genesis() external view returns(uint);
    // function baseAmt() external view returns(uint);
    // function tokenAmt() external view returns(uint);
    // function baseAmtStaked() external view returns(uint);
    // function tokenAmtStaked() external view returns(uint);
    // function fees() external view returns(uint);
    // function volume() external view returns(uint);
    // function txCount() external view returns(uint);
    function getBaseAmtStaked(address) external view returns(uint);
    // function getTokenAmtStaked(address) external view returns(uint);
    // function calcValueInBase(uint) external view returns (uint);
    // function calcValueInToken(uint) external view returns (uint);
    // function calcTokenPPinBase(uint) external view returns (uint);
    // function calcBasePPinToken(uint) external view returns (uint);
    function transferTo(address, uint) external returns (bool);
}
interface iUTILS {
    // function calcPart(uint bp, uint total) external pure returns (uint part);
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    // function calcSwapOutput(uint x, uint X, uint Y) external pure returns (uint output);
    // function calcSwapFee(uint x, uint X, uint Y) external pure returns (uint output);
    // function calcStakeUnits(uint a, uint A, uint v, uint S) external pure returns (uint units);
    // function calcAsymmetricShare(uint s, uint T, uint A) external pure returns (uint share);
    // function getPoolAge(address token) external view returns(uint age);
    // function getPoolShare(address token, uint units) external view returns(uint baseAmt, uint tokenAmt);
    // function getPoolShareAssym(address token, uint units, bool toBase) external view returns(uint baseAmt, uint tokenAmt, uint outputAmt);
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


contract SDao {

    using SafeMath for uint;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;
    address public DEPLOYER;

    address private _router;
    iUTILS public UTILS;

    uint256 public totalWeight;
    uint public one = 10**18;
    uint public coolOffPeriod = 1 * 2;

    address public proposedRouter;
    bool public proposedRouterChange;
    uint public routerChangeStart;

    address public proposedDao;
    bool public proposedDaoChange;
    uint public daoChangeStart;
    bool public daoHasMoved;
    address public SDAO;

    address[] public arrayMembers;
    mapping(address => bool) public isMember; // Is Member
    mapping(address => mapping(address => uint256)) public mapMemberPool_Balance; // Member's balance in pool
    mapping(address => uint256) public mapMember_Weight; // Value of weight

    mapping(address => uint256) public mapAddress_Votes; // Value of weight
    mapping(address => mapping(address => uint256)) public mapRouterMember_Votes; // Value of weight
    mapping(address => uint256) public mapAddress_Votes; // Value of weight
    mapping(address => mapping(address => uint256)) public mapDaoMember_Votes; // Value of weight

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
        require(msg.sender == DEPLOYER, "AdminErr");
        _;
    }

    constructor (iUTILS _utils) public payable {
        _status = _NOT_ENTERED;
        UTILS = _utils;
        DEPLOYER = msg.sender;
    }
    function setGenesisRouter(address genesisRouter) public onlyDeployer {
        _router = genesisRouter;
        DEPLOYER = address(0);
    }

    //============================== USER - LOCK/UNLOCK ================================//
    // Member locks some LP tokens
    function lock(address pool, uint256 amount) public nonReentrant {
        require(iSROUTER(_router).isPool(pool) == true, "Must be listed");
        require(amount > 0, "Must get some");
        if (!isMember[msg.sender]) {
            arrayMembers.push(msg.sender);
            isMember[msg.sender] = true;
        }
        require(iSPOOL(pool).transferTo(address(this), amount),"Must transfer"); // Uni/Bal LP tokens return bool
        mapMemberPool_Balance[msg.sender][pool] = mapMemberPool_Balance[msg.sender][pool].add(amount); // Record total pool balance for member
        registerWeight(msg.sender, pool); // Register weight
        emit MemberLocks(msg.sender, pool, amount);
    }

    // Member unlocks all from a pool
    function unlock(address pool) public nonReentrant {
        uint256 balance = mapMemberPool_Balance[msg.sender][pool];
        require(balance > 0, "Must have a balance to weight");
        zeroWeight(pool, msg.sender);
        require(iERC20(pool).transfer(msg.sender, balance), "Must transfer"); // Then transfer
        emit MemberUnlocks(msg.sender, pool, balance);
    }

    // Member registers weight in a single pool
    function registerWeight(address member, address pool) internal {
        uint weight = updateWeight(pool, member);
        emit MemberRegisters(member, pool, weight);
    }

    function updateWeight(address pool, address member) public returns(uint){
        totalWeight = totalWeight.sub(mapMember_Weight[member]); // Remove previous weights
        uint weight = iSPOOL(pool).getBaseAmtStaked(member);
        mapMember_Weight[member] = weight;
        totalWeight += weight;
        return weight;
    }
    function zeroWeight(address pool, address member) internal {
        mapMemberPool_Balance[member][pool] = 0; // Zero out balance
        totalWeight = totalWeight.sub(mapMember_Weight[member]); // Remove that weight
        mapMember_Weight[member] = 0; // Zero out balance
    }

    //============================== GOVERNANCE ================================//

    // Member votes new Router
    function voteRouterChange(address router) public nonReentrant {
        mapAddress_Votes[router] = mapAddress_Votes[router].sub(mapRouterMember_Votes[router][msg.sender]);
        uint voteWeight = mapMember_Weight[msg.sender];
        mapAddress_Votes[router] += voteWeight;
        mapRouterMember_Votes[router][msg.sender] = voteWeight;
        updateRouterChange(router);
        emit NewVote(msg.sender, router, voteWeight, mapAddress_Votes[router], 'ROUTER');
    }
    function updateRouterChange(address _newRouter) internal {
        if(hasQuorum(_newRouter)){
            proposedRouter = _newRouter;
            proposedRouterChange = true;
            routerChangeStart = now;
            emit ProposalFinalising(msg.sender, _newRouter, now+coolOffPeriod, 'ROUTER');
        }
    }

    function moveRouter() public nonReentrant {
        checkRouterChange(proposedRouter);
        if(proposedRouterChange){
            if((now - routerChangeStart) > coolOffPeriod){
                _router = proposedRouter;
                emit NewAddress(msg.sender, _router, mapAddress_Votes[proposedRouter], totalWeight, 'ROUTER');
                mapAddress_Votes[proposedRouter] = 0;
                proposedRouter = address(0);
                proposedRouterChange = false;
            }
        }
    }
    function checkRouterChange(address _newRouter) internal {
        if(hasQuorum(_newRouter)){
            proposedRouterChange = false;
        }
    }

    // Member votes new DAO
    function voteDaoChange(address newDao) public nonReentrant {
        mapAddress_Votes[newDao] = mapAddress_Votes[newDao].sub(mapDaoMember_Votes[newDao][msg.sender]);
        uint voteWeight = mapMember_Weight[msg.sender];
        mapAddress_Votes[newDao] += voteWeight;
        mapDaoMember_Votes[newDao][msg.sender] += voteWeight;
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
        checkDaoChange(proposedDao);
        if(proposedDaoChange){
            if((now - daoChangeStart) > coolOffPeriod){
                daoHasMoved = true;
                SDAO = proposedDao;
            }
        }
    }
    function checkDaoChange(address _newDao) internal {
        uint yesVotes = mapAddress_Votes[_newDao];
        uint consensus = totalWeight.div(2);
        if(yesVotes <= consensus){
            proposedDao = _newDao;
            proposedDaoChange = true;
            daoChangeStart = now;
        }
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
            return SDao(SDAO).ROUTER();
        } else {
            return _router;
        }
    }
}

        // if (!poolHasMembers[pool]) {
        //     poolHasMembers[pool] = true;
        // }
        // if (!mapMemberPool_Added[msg.sender][pool]) {
        //     mapMember_poolCount[msg.sender] = mapMember_poolCount[msg.sender].add(1);
        //     mapMember_arrayPools[msg.sender].push(pool);
        //     mapMemberPool_Added[msg.sender][pool] = true;
        // }

    // // Member registers weight in a single pool
    // function harvestOne(address member, address pool) internal {
    //     // Update weights with latest data
    //     // Calculate share of rewards
    //     // Pay out
    //     totalWeight = totalWeight.sub(mapMember_Weight[member]); // Remove that weight
    //     uint sparta = iSPOOL(pool).getBaseAmtStaked(member);
    //     mapMember_Weight[member] = sparta;
    //     totalWeight += sparta;
        
    //     emit MemberRegisters(member, sparta);
    //     uint reward = calcReward(member);
    // }

    // function calcReward(address member) public view returns(uint){
    //     uint blocksPast = block.number - mapMember_Block[member];
    // }