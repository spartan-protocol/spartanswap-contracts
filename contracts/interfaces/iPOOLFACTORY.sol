pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;

interface iPOOLFACTORY {
    function isCuratedPool(address) external view returns (bool);
    function challengLowestCuratedPool(address) external view returns (bool);
    function addCuratedPool(address) external returns (bool);
    function removeCuratedPool(address) external returns (bool);
    function isPool(address) external returns (bool);
     function getCuratedPool(uint) external view returns(address);
    function getPool(address) external view returns(address payable);
    function getPoolArray(uint) external view returns(address payable);
    function poolCount() external view returns(uint);
    function getToken(uint) external view returns(address);
    function tokenCount() external view returns(uint);
    function getCuratedPoolsLength() external view returns (uint);
}