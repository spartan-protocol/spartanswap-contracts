// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iPOOLFACTORY {
    function isCuratedPool(address) external view returns (bool);
    function addCuratedPool(address) external;
    function removeCuratedPool(address) external;
    function isPool(address) external returns (bool);
    function getPool(address) external view returns(address);
    function getVaultAssets() external view returns(address [] memory);
    function getPoolAssets() external view returns(address [] memory);
    function curatedPoolCount() external view returns (uint);
}
