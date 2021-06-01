// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iPOOLFACTORY {
    function isCuratedPool(address) external view returns (bool);
    function challengLowestCuratedPool(address) external view returns (bool);
    function addCuratedPool(address) external returns (bool);
    function removeCuratedPool(address) external returns (bool);
    function getCuratedPool(uint) external view returns(address);
    function isPool(address) external returns (bool);
    function getPool(address) external view returns(address);
    function createPool(address) external view returns(address);
    function getPoolArray(uint) external view returns(address);
    function poolCount() external view returns(uint);
    function getToken(uint) external view returns(address);
    function tokenCount() external view returns(uint);
    function getCuratedPoolsLength() external view returns (uint);
}
