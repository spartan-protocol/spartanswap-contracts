// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBASE.sol";

contract Utils {

    address public BASE;

    constructor (address _base) {
        BASE = _base;
    }
    //====================================CORE-MATH====================================//

     function getFeeOnTransfer(uint256 totalSupply, uint256 maxSupply) external pure returns (uint256) {
        return calcShare(totalSupply, maxSupply, 100); // 0->100BP
    }

    function calcPart(uint256 bp, uint256 total) public pure returns (uint256) {
        // 10,000 basis points = 100.00%
        require(bp <= 10000, "Must be correct BP");
        return calcShare(bp, 10000, total);
    }

    function calcShare(uint256 part, uint256 total, uint256 amount) public pure returns (uint256 share) {
        // share = amount * part/total
        if (part > total) {
            part = total;
        }
        if (total > 0) {
            share = (amount * part) / total;
        }
    }

 

}