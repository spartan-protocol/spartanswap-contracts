// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;

interface iSYNTHFACTORY {
    function isSynth(address) external returns (bool);
}