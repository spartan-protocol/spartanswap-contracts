// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iROUTER {
    function addLiquidityForMember(uint, uint, address, address) external payable returns (uint);
    function synthMinting() external view returns (bool);
    function swapTo(uint256, address, address, address, uint256 ) external payable;
}