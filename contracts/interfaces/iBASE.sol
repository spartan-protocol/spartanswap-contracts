pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;

interface iBASE {
    function DAO() external view returns (address);
    function burn(uint) external;
}