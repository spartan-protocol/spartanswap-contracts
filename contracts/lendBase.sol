// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iDAO.sol";
import "./iBASE.sol";
import "hardhat/console.sol";


contract SLend {

    address public BASE;
    address public DEPLOYER;

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
      
    }

    

}