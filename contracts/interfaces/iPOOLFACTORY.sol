pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;

interface iPOOLFACTORY {
    function isCuratedPool(address) external view returns (bool);
    function challengLowestCuratedPool(address) external view returns (bool);
    function addCuratedPool(address) external returns (bool);
    function removeCuratedPool(address) external returns (bool);
    function getPool(address token) external returns (address);
    function getPoolArray(uint i) external returns (address);
    function poolCount() external returns (uint);
    function isPool(address) external returns (bool);
}