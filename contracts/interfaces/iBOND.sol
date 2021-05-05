pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;


interface iBOND {
    function bondingPeriodSeconds() external view returns(uint);
    function listBondAsset(address) external returns (bool);
    function delistBondAsset(address) external returns (bool);
    function changeBondingPeriod(uint) external returns (bool);
    function depositInit(address, uint, address) external;
}