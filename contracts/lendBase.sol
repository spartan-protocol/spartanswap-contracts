// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iDAO.sol";
import "./iBEP20.sol";
import "./iBASE.sol";
import "./iROUTER.sol";
import "./iRESERVE.sol";
import "./iPOOLFACTORY.sol";
import "./TransferHelper.sol";
import "hardhat/console.sol";


contract SLend {

    address public BASE;
    address public DEPLOYER;
    uint256 public lockUpPeriod;
    uint256 public yieldFactor;
    uint256 public minLockPeriodDays;
    uint256 public maxLockPeriodDays;
    uint256 public totalLend;

    

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _; 
    }

    mapping(address => mapping(address => uint256)) mapMemberPool_BaseLend;
    mapping(address => mapping(address => uint256)) mapMemberPool_LendTime;
    mapping(address => mapping(address => uint256)) mapMemberPool_LockTerm;
    mapping(address => uint256) public mapPool_Balance;
    mapping(address => uint256) public mapPool_YieldBase;

    
    event Lend(address indexed member, address indexed token, uint256 amount);
    event Remove(address indexed member, address indexed token, uint256 amount);

    constructor (address _base)  {
        BASE = _base;
        DEPLOYER = msg.sender;
        minLockPeriodDays = 1;//24hrs
        maxLockPeriodDays = 30;
        yieldFactor = 5;// 5bp
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    function init(uint256 _minLockPeriod, uint256 _maxLockPeriod) external onlyDAO {
        minLockPeriodDays = _minLockPeriod;//24hrs
        maxLockPeriodDays = _maxLockPeriod;
    }

    function yieldParams(uint256 _yieldFactor) external onlyDAO {
        yieldFactor = _yieldFactor;
    }

    function lendBase(uint256 amount, address token, uint256 term) external {
        require((term > minLockPeriodDays) && (term < maxLockPeriodDays), '!TIME'); // term min 24hrs - max 30 days
        address yieldPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        require(mapMemberPool_BaseLend[msg.sender][yieldPool] == 0 ,'!NEW'); //lending base must only accepts new members - otherwise they must remove their current position then lend again
        TransferHelper.safeTransferFrom(BASE, msg.sender, address(this), amount); // get base
        iBEP20(BASE).approve(_DAO().ROUTER(), amount); // perform router sparta approval - can be a manual operation by deployer to save gas - but not sustainable
        iROUTER(_DAO().ROUTER()).addLiquidityAsym(iBEP20(BASE).balanceOf(address(this)), true, token); // add asym to router
        uint256 _actual = _getAddedLP(yieldPool);
        mapPool_Balance[yieldPool] += _actual; // record added SPP's
        mapPool_YieldBase[yieldPool] += amount; //record base into yield pool
        mapMemberPool_BaseLend[msg.sender][yieldPool] = amount; //reocrd original amount - not after feeBurn- protocol incures fee
        mapMemberPool_LendTime[msg.sender][yieldPool] = block.timestamp; //record their timeStamp
        mapMemberPool_LockTerm[msg.sender][yieldPool] = block.timestamp + (term * 86400); //record their chosen lock term in days * 86400
        emit Lend(msg.sender, token, amount);
    }


    function removeBase(address token) external {
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '!SAFE');
        address yieldPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        require(block.timestamp > mapMemberPool_LockTerm[msg.sender][yieldPool], '!TIME');
        uint256 poolShare = (mapMemberPool_BaseLend[msg.sender][yieldPool] * mapPool_Balance[yieldPool]) / mapPool_YieldBase[yieldPool];  // share = amount * part/total
        mapPool_YieldBase[yieldPool] -= mapMemberPool_BaseLend[msg.sender][yieldPool];
        mapPool_Balance[yieldPool] -= poolShare;
        iBEP20(yieldPool).approve(_DAO().ROUTER(), poolShare); // perform router pool approval 
        iROUTER(_DAO().ROUTER()).removeLiquidityExactAsym(poolShare, true,  token);
        TransferHelper.safeTransfer(BASE, address(_DAO().RESERVE()), iBEP20(BASE).balanceOf(address(this)));
        uint256 yield = calcYield(msg.sender, yieldPool);
        uint256 totalRedemption = mapMemberPool_BaseLend[msg.sender][yieldPool] + yield;
        iRESERVE(_DAO().RESERVE()).grantFunds(totalRedemption, msg.sender); // grant original + yield
        emit Remove(msg.sender, token, totalRedemption);
    }

    function calcYield(address _member, address yieldPool) internal view returns (uint256 yield){
        uint256 _daysLocked = mapMemberPool_LockTerm[_member][yieldPool] / 86400;
        return mapMemberPool_BaseLend[_member][yieldPool] * yieldFactor * _daysLocked;
    }

     function _getAddedLP(address _pool) internal view returns(uint256 _actual){
        uint _poolBalance = iBEP20(_pool).balanceOf(address(this));
        if(_poolBalance > mapPool_Balance[_pool]){
            _actual = _poolBalance - mapPool_Balance[_pool];
        } else {
            _actual = 0;
        }
        return _actual;
    }



      // Can purge deployer once DAO is stable and final
    function purgeDeployer() external onlyDAO {
        DEPLOYER = address(0);
    }

  
              
    

    

}