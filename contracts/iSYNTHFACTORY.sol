// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iSYNTHFACTORY {
    function isSynth(address) external view returns (bool);
    function getSynth(address) external view returns (address);
    function removeSynth(address _token) external;
    function synthCount() external returns(uint);
}