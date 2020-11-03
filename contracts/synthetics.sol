// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

interface iBEP20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function burnFrom(address, uint256) external;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
interface iBASE {
    function secondsPerEra() external view returns (uint256);
    function DAO() external view returns (iDAO);
}
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
}
interface iDAO {
    function ROUTER() external view returns(address);
    function UTILS() external view returns(iUTILS);
}

// SafeMath
library SafeMath {

    function add(uint256 a, uint256 b) internal pure returns (uint256)   {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }

    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        require(c / a == b, "SafeMath");
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath");
    }
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath");
    }
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        return c;
    }
}


contract Synthetics {

    using SafeMath for uint256;

    address public BASE;
    address public ROUTER;

   
    constructor (address _base, address _router) public payable {
        BASE = _base;
        ROUTER = _router;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    
    

    //==================================================================================//
    // Add/Remove Liquidity functions

    

}