//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iUTILS {
    function calcPart(uint bp, uint total) external pure returns (uint part);
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    function calcSpotValueInBase(address, uint) external pure returns (uint);
    function getFeeOnTransfer(uint256 totalSupply, uint256 maxSupply) external view returns(uint);
    function calcSwapValueInBase(address pool, uint256 amount) external view returns (uint256 value);
    function getPoolShareWeight(address token, uint units)external view returns(uint weight);
}