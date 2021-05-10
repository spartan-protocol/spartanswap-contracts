// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iRESERVE {
    function grantFunds(uint, address) external returns(uint); 
    function emissions() external returns(bool); 
}
