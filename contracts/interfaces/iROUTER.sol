pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;

interface iROUTER {
    function addLiquidityForMember(uint, uint, address, address) external payable returns (uint);
    function grantFunds(uint, address) external payable returns (bool);
    function changeArrayFeeSize(uint) external returns(bool);
    function changeMaxTrades(uint) external returns(bool);
    function addLiquidity(uint, uint, address) external payable returns (uint);
}