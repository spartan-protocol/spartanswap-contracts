// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iDAO.sol";
import "./iBASE.sol";
import "hardhat/console.sol";


contract SpartanLend {

    address public BASE;
    address public DEPLOYER;
    address public LendRouter;
    address public LendVault;

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _; 
    }

    constructor (address _base)  {
        BASE = _base;
        DEPLOYER = msg.sender;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }


    function setGenesisAddresses(address _lendRouter, address _lendVault) external onlyDAO {
        LendRouter = _lendRouter;
        LendVault = _lendVault;
    }

    //Add collateral and borrow curated asset
    function borrow(uint amount, address assetC, address assetD, address member) public returns (uint256 assetDebtIssued) {
    
    }

    // payback debt and remove collateral
    function payBack(uint amount,address assetC, address assetD, address member) public returns (uint _assetCollateralRemoved){

    }

    //internal function to calc interest 
    function calcInterestAmount(address _assetC, address _assetD) internal view returns (uint){

    }

    //public callable to check solvency 
    function checkliquidate(address assetC) public returns (uint fee){

    }

     //purge a debt pool when it can't pay interest
    function _checkPurge() internal returns (bool){

    }

     //calc interest to be paid
    function _payInterest() internal returns (uint _InterestAmount){
    }


}