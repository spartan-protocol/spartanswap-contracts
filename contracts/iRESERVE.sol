// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iRESERVE {
    function grantFunds(uint, address) external; 
    function emissions() external returns(bool); 
    function setGlobalFreeze(bool) external; 
    function setIncentiveAddresses(address, address, address, address) external;
    function globalFreeze() external returns(bool); 
    function freezeTime() external returns(uint256); 
    function polPoolAddress() external returns(address); 
}
