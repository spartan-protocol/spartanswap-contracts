// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBASE.sol";
import "./iPOOLFACTORY.sol";
import "./iPOOL.sol";
import "./iSYNTH.sol";
import "./iBEP20.sol";



contract Utils {

    address public BASE;
    uint public one = 10**18;
    constructor (address _base) {
        BASE = _base;
    }
    struct PoolDataStruct {
        address tokenAddress;
        address poolAddress;
        uint genesis;
        uint baseAmount;
        uint tokenAmount;
        uint fees;
        uint volume;
        uint txCount;
        uint poolUnits;
    }
     function _DAO() internal view returns(iDAO) {
         return iBASE(BASE).DAO();
    }


    //==================================HELPERS================================//
     function getPoolData(address token) public view returns(PoolDataStruct memory poolData){
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        poolData.poolAddress = pool;
        poolData.tokenAddress = token;
        poolData.genesis = iPOOL(pool).genesis();
        poolData.baseAmount = iPOOL(pool).baseAmount();
        poolData.tokenAmount = iPOOL(pool).tokenAmount();
        poolData.poolUnits = iBEP20(pool).totalSupply();
        return poolData;
    }

    function getPoolShareWeight(address token, uint units) public view returns(uint weight){
        address pool = getPool(token);
        weight = calcShare(units, iBEP20(pool).totalSupply(), iPOOL(pool).baseAmount());
        return (weight);
    }
    function getPool(address token) public view returns(address pool){
        return iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
    }

    //====================================CORE-MATH====================================//

     function getFeeOnTransfer(uint256 totalSupply, uint256 maxSupply) external pure returns (uint256) {
        return calcShare(totalSupply, maxSupply, 100); // 0->100BP
    }

    function calcPart(uint256 bp, uint256 total) public pure returns (uint256) {
        // 10,000 basis points = 100.00%
        require(bp <= 10000, "Must be correct BP");
        return calcShare(bp, 10000, total);
    }

    function calcShare(uint256 part, uint256 total, uint256 amount) public pure returns (uint256 share) {
        // share = amount * part/total
        if (part > total) {
            part = total;
        }
        if (total > 0) {
            share = (amount * part) / total;
        }
    }

    function calcLiquidityUnits(uint b, uint B, uint t, uint T, uint P) public view returns (uint units){
        if(P == 0){
            return b;
        } else {
            // units = ((P (t B + T b))/(2 T B)) * slipAdjustment
            // P * (part1 + part2) / (part3) * slipAdjustment
            uint slipAdjustment = getSlipAdustment(b, B, t, T);
            uint part1 = t*(B);
            uint part2 = T*(b);
            uint part3 = T*(B)*(2);
              uint _units = (P * (part1 + (part2))) / (part3);
            return _units * slipAdjustment / one;  // Divide by 10**18
        }
    }
    function getSlipAdustment(uint b, uint B, uint t, uint T) public view returns (uint slipAdjustment){
        // slipAdjustment = (1 - ABS((B t - b T)/((2 b + B) (t + T))))
        // 1 - ABS(part1 - part2)/(part3 * part4))
        uint part1 = B * (t);
        uint part2 = b * (T);
        uint part3 = b * (2) + (B);
        uint part4 = t + (T);
        uint numerator;
        if(part1 > part2){
            numerator = part1 - (part2);
        } else {
            numerator = part2 - (part1);
        }
        uint denominator = part3 * (part4);
        return one - ((numerator * (one)) / (denominator)); // Multiply by 10**18
    }

     function calcLiquidityHoldings(uint units, address token, address pool) public view returns (uint share){
        // share = amount * part/total
        // address pool = getPool(token);
        uint amount;
        if(token == BASE){
            amount = iPOOL(pool).baseAmount();
        }else{
            amount = iPOOL(pool).tokenAmount();
        }
        uint totalSupply = iBEP20(pool).totalSupply();
        return(amount*(units))/(totalSupply);
    }

    function  calcSwapOutput(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * X * Y )/(x + X)^2
        uint numerator = x * (X * (Y));
        uint denominator = (x + (X)) * (x + (X));
        return numerator / (denominator);
    }

    function  calcSwapFee(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * x * Y) / (x + X)^2
        uint numerator = x * (x * (Y));
        uint denominator = (x + (X)) * (x + (X));
        return numerator / (denominator);
    }

    function calcAsymmetricValueToken(address pool, uint amount) public view returns (uint tokenValue){
        uint baseAmount = calcShare(amount, iBEP20(pool).totalSupply(), iPOOL(pool).baseAmount());
        uint tokenAmount = calcShare(amount, iBEP20(pool).totalSupply(), iPOOL(pool).tokenAmount());
        uint baseSwapped = calcSwapValueInTokenWithPool(pool, baseAmount);
        tokenValue = tokenAmount + baseSwapped;
        return tokenValue;
    }

    //synthUnits += (P b)/(2 (b + B))
     function calcLiquidityUnitsAsym(uint amount, address pool) public view returns (uint units){
        uint baseAmount = iPOOL(pool).baseAmount();
        uint totalSupply = iBEP20(pool).totalSupply();
        uint two = 2;
         return (totalSupply * amount) / (two * (amount + baseAmount));
     }

    //====================================PRICING====================================//

    function calcSpotValueInBase(address token, uint amount) public view returns (uint value){
      address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
       return calcSpotValueInBaseWithPool(pool, amount);
    }

    function calcSpotValueInToken(address token, uint amount) public view returns (uint value){
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        return calcSpotValueInTokenWithPool(pool, amount);
    }

    function calcSwapValueInBase(address token, uint amount) public view returns (uint _output){
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        return  calcSwapValueInBaseWithPool(pool, amount);
   }
   function calcSwapValueInBaseWithSYNTH(address synth, uint amount) public view returns (uint _output){
       address token = iSYNTH(synth).LayerONE();
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        return  calcSwapValueInBaseWithPool(pool, amount);
   }

    function calcSwapValueInToken(address token, uint amount) public view returns (uint _output){
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        return  calcSwapValueInTokenWithPool(pool, amount);
    }

    function calcSpotValueInBaseWithPool(address pool, uint amount) public view returns (uint value){
       uint _baseAmount = iPOOL(pool).baseAmount();
       uint _tokenAmount = iPOOL(pool).tokenAmount();
       return (amount*(_baseAmount))/(_tokenAmount);
    }

    function calcSpotValueInTokenWithPool(address pool, uint amount) public view returns (uint value){
        uint _baseAmount = iPOOL(pool).baseAmount();
        uint _tokenAmount = iPOOL(pool).tokenAmount();
        return (amount*(_tokenAmount))/(_baseAmount);
    }

    function calcSwapValueInBaseWithPool(address pool, uint amount) public view returns (uint _output){
        uint _baseAmount = iPOOL(pool).baseAmount();
        uint _tokenAmount = iPOOL(pool).tokenAmount();
        return  calcSwapOutput(amount, _tokenAmount, _baseAmount);
   }

    function calcSwapValueInTokenWithPool(address pool, uint amount) public view returns (uint _output){
        uint _baseAmount = iPOOL(pool).baseAmount();
        uint _tokenAmount = iPOOL(pool).tokenAmount();
        return  calcSwapOutput(amount, _baseAmount, _tokenAmount);
    }

    function calcActualSynthUnits(uint amount, address synth) public view returns (uint _output) {
        address token = iSYNTH(synth).LayerONE();
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        uint _baseAmount = iPOOL(pool).baseAmount();
        uint _tokenAmount = iPOOL(pool).tokenAmount();
        return ((amount * _baseAmount) / (2 * _tokenAmount));
    }


    
 

}