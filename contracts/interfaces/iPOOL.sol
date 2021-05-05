pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;

interface iPOOL {
    function TOKEN() external view returns(address);
    function removeLiquidity() external returns (uint, uint);
}