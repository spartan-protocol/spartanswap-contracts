// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iDAO.sol";
import "./iBASE.sol";
import "hardhat/console.sol";

contract SPLend {

    address public immutable BASE;  // Sparta address
    address public DEPLOYER;        // Address that deployed this contract | can be purged to address(0)

    constructor (address _base) public {
        BASE = _base;
        DEPLOYER = msg.sender;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

}