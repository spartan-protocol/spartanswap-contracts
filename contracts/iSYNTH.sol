// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iSYNTH {
    function genesis() external view returns(uint);
    function TOKEN() external view returns(address);
    function POOL() external view returns(address);
    function mintSynth(address, uint) external returns(uint256);
    function burnSynth(uint) external returns(uint);
    function realise() external;
}
