
//iBEP20 Interface
pragma solidity 0.8.3;

interface iUTILS {
    function calcPart(uint bp, uint total) external pure returns (uint part);
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    function calcLiquidityShare(uint units, address token, address pool, address member) external pure returns (uint share);
    function calcSwapOutput(uint x, uint X, uint Y) external pure returns (uint output);
    function calcSwapFee(uint x, uint X, uint Y) external pure returns (uint output);
    function calcLiquidityUnits(uint b, uint B, uint t, uint T, uint P) external pure returns (uint units);
    function getPoolShare(address token, uint units) external view returns(uint baseAmount, uint tokenAmount);
    function getPoolShareAssym(address token, uint units, bool toBase) external view returns(uint baseAmount, uint tokenAmount, uint outputAmt);
    function calcValueInBase(address token, uint amount) external view returns (uint value);
    function calcValueInToken(address token, uint amount) external view returns (uint value);
    function calcValueInBaseWithPool(address pool, uint amount) external view returns (uint value);
    function calcTokenPPinBase(address pool, uint256 amount) external view returns (uint256 value);
    function getPool(address token)external view returns (address value);
    function getFeeOnTransfer(uint256 totalSupply, uint256 maxSupply) external view returns(uint);
}