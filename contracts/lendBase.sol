// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iDAO.sol";
import "./iBEP20.sol";
import "./iBASE.sol";
import "./iROUTER.sol";
import "./TransferHelper.sol";
import "hardhat/console.sol";


contract SLend {

    address public BASE;
    address public DEPLOYER;
    uint256 public lockUpPeriod;
    uint256 public yieldPercent;
    uint256 public minLockPeriod;
    uint256 public maxLockPeriod;

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _; 
    }

    mapping(address => uint256) public mapMember_BaseLend;
    mapping(address => uint256) public mapMember_LendTime;
    mapping(address => uint256) public mapMember_LockPeriod;
    

    event Lend(address indexed member, address indexed token, uint256 amount);
    event Remove(address indexed member, address indexed token, uint256 amount);

    constructor (address _base)  {
        BASE = _base;
        DEPLOYER = msg.sender;
        minLockPeriod = 86400;//24hrs
        yieldPercent = 50;//50bp
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    function lendBase(uint256 amount, address token, uint256 lockPeriod) external {
        require((lockPeriod > minLockPeriod) && (lockPeriod < maxLockPeriod), '!TIME');
        require(mapMember_BaseLend[msg.sender] == 0 ,'!NEW'); //lending base must only accepts new members - otherwise they must remove their current position then lend again
        TransferHelper.safeTransferFrom(BASE, msg.sender, address(this), amount); // get sparta first
        iBEP20(BASE).approve(_DAO().ROUTER(), amount); // perform router sparta approval - can be a manual operation by deployer to save gas but not sustainable
        iROUTER(_DAO().ROUTER()).addLiquidityAsym(amount, true, token); // add asym to router 
        mapMember_BaseLend[msg.sender] = amount; //reocrd original amount - not after feeBurn- protocol incures fee
        mapMember_LendTime[msg.sender] = block.timestamp; //record their timeStamp
        mapMember_LockPeriod[msg.sender] = block.timestamp + lockPeriod; //record their chosen lockPeriod
        emit Lend(msg.sender, token, amount);
    }


    function removeBase(uint256 bp) external {
        require(block.timestamp > mapMember_LockPeriod[msg.sender], '!TIME');

        TransferHelper.safeTransfer(BASE, msg.sender, _amount);
    }

    function calcInterest (uint256 member) internal returns (uint256 interest){



    }


      // Can purge deployer once DAO is stable and final
    function purgeDeployer() external onlyDAO {
        DEPLOYER = address(0);
    }

  
              
    

    

}