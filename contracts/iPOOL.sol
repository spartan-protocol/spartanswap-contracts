// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iPOOL {
    function TOKEN() external view returns(address);
    function genesis() external view returns(uint);
    function baseAmount() external view returns(uint);
    function tokenAmount() external view returns(uint);
    function sync() external;
    function SYNTH() external returns (address);
    function stirCauldron(address) external returns (uint); 
    function mintSynth( address) external returns (uint256, uint256);
    function synthCap() external view returns (uint);
    function baseCap() external view returns (uint);
}