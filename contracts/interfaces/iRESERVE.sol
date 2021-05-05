pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;

interface iRESERVE {
    function grantFunds(uint, address) external returns(uint); 
    function emissions() external returns(bool); 
}
