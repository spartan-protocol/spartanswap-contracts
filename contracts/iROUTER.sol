// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iROUTER {
    function addLiquidityForMember(uint, uint, address, address) external payable returns (uint);
    function synthMinting() external view returns (bool);
    function lastMonth() external view returns(uint); 
    function mapAddress_30DayDividends(address) external returns (uint);
    function mapAddress_Past30DayPoolDividends(address) external returns (uint);
    function addLiquidityAsym(uint input, bool fromBase, address token) external;
    function removeLiquidityExactAsym(uint input, bool fromBase, address token) external;
    function syncPool(address, uint256) external;
}