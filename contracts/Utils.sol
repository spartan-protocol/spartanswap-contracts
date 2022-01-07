// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBASE.sol";
import "./iPOOLFACTORY.sol";
import "./iSYNTHFACTORY.sol";
import "./iPOOL.sol";
import "./iSYNTH.sol";
import "./iBEP20.sol";

contract Utils {
    address public immutable BASE; // SPARTA base contract address
    uint256 private constant one = 1*10**18;

    constructor (address _base) {
        BASE = _base;
    }

    struct PoolDataStruct {
        address tokenAddress;
        address poolAddress;
        uint genesis;
        uint baseAmount;
        uint tokenAmount;
        uint poolUnits;
        uint synthCap;
        uint baseCap;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    //================================== HELPERS ================================//

    function getPoolData(address token) external view returns(PoolDataStruct memory poolData){
        address pool = getPool(token);
        poolData.tokenAddress = token;
        poolData.poolAddress = pool;
        poolData.genesis = iPOOL(pool).genesis();
        poolData.baseAmount = iPOOL(pool).baseAmount();
        poolData.tokenAmount = iPOOL(pool).tokenAmount();
        poolData.poolUnits = iBEP20(pool).totalSupply();
        poolData.synthCap = iPOOL(pool).synthCap();
        poolData.baseCap = iPOOL(pool).baseCap();   
        return poolData;
    }

    function getPoolShareWeight(address pool, uint units) external view returns(uint weight){
        weight = calcShare(units, iBEP20(pool).totalSupply(), iPOOL(pool).baseAmount());
        return weight;
    }

    function getPool(address token) public view returns(address pool){
        return iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
    }

    function getSynth(address token) external view returns(address synth){
        return iSYNTHFACTORY(_DAO().SYNTHFACTORY()).getSynth(token);
    }

    //================================== CORE-MATH ==================================//
    
    // Calculate the feeBurn's feeOnTransfer based on total supply
    function getFeeOnTransfer(uint256, uint256) external pure returns (uint256) {
        return 0;
    }

    // Calculate 'part' of a total using basis points | 10,000 basis points = 100.00%
    function calcPart(uint256 bp, uint256 total) external view returns (uint256) {
        if (msg.sender == BASE) {
            return 0;
        }
        require(bp <= 10000, "!bp"); // basis points must be valid
        return calcShare(bp, 10000, total);
    }

    // Calc share | share = amount * part / total
    function calcShare(uint256 part, uint256 total, uint256 amount) public pure returns (uint256 share) {
        require(total > 0, '!DIVISION');
        if (part > total) {
            part = total; // Part cant be greater than the total
        }
        share = (amount * part) / total;
    }

    // Calculate liquidity units
    function calcLiquidityUnits(uint b, uint B, uint t, uint T, uint P) external pure returns (uint units){
        if(P == 0){
            return b; // If pool is empty; use b as initial units
        } else {
            // units = ((P (t B + T b))/(2 T B)) * slipAdjustment
            // P * (part1 + part2) / (part3) * slipAdjustment
            uint slipAdjustment = getSlipAdjustment(b, B, t, T);
            require(slipAdjustment > (9.8 * 10**17)); // Resist asym liqAdds
            uint part1 = t * B;     // tokenInput * baseDepth
            uint part2 = T * b;     // tokenDepth * baseInput
            uint part3 = T * B * 2; // tokenDepth * baseDepth * 2
            require(part3 > 0, '!DIVISION');
            uint _units = (P * (part1 + part2)) / part3;  // P == totalSupply
            return _units * slipAdjustment / one;  // Divide by 10**18
        }
    }

    // Get slip adjustment (Protects capital erosion from asymAdds)
    function getSlipAdjustment(uint b, uint B, uint t, uint T) public pure returns (uint slipAdjustment){
        // slipAdjustment = (1 - ABS((B t - b T)/((2 b + B) (t + T))))
        // 1 - ABS(part1 - part2)/(part3 * part4))
        uint part1 = B * t;     // baseDepth * tokenInput
        uint part2 = b * T;     // baseInput * tokenDepth
        uint part3 = 2 * b + B; // 2 * baseInput + baseDepth (Modified to reduce slip adjustment)
        uint part4 = t + T;     // tokenInput + tokenDepth
        uint numerator;
        if(part1 > part2){
            numerator = part1 - part2;
        } else {
            numerator = part2 - part1;
        }
        uint denominator = part3 * part4;
        require(denominator > 0, '!DIVISION');
        return one - ((numerator * one) / denominator); // Multiply by 10**18
    }

    // Calculate symmetrical redemption value of LP tokens (per side)
    function calcLiquidityHoldings(uint units, address token, address pool) external view returns (uint share){
        // share = amount * part / total
        // address pool = getPool(token);
        uint amount;
        if(token == BASE){
            amount = iPOOL(pool).baseAmount(); // Get SPARTA depth of pool
        } else {
            amount = iPOOL(pool).tokenAmount(); // Get TOKEN depth of pool
        }
        uint totalSupply = iBEP20(pool).totalSupply(); // Get total supply of LPs
        require(totalSupply > 0, '!DIVISION');
        return (amount * units) / totalSupply;
    }

    function calcSwapOutput(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * X * Y )/(x + X)^2
        uint numerator = x * X * Y;
        uint denominator = (x + X) * (x + X);
        require(denominator > 0, '!DIVISION');
        return numerator / denominator;
    }

    function calcSwapFee(uint x, uint X, uint Y) external pure returns (uint output){
        // y = (x * x * Y) / (x + X)^2
        uint numerator = x * x * Y;
        uint denominator = (x + X) * (x + X);
        require(denominator > 0, '!DIVISION');
        return numerator / denominator;
    }

    function calcLiquidityUnitsAsym(uint amount, address pool) external view returns (uint units){
        // synthUnits += (P b)/(2 (b + B))
        uint baseAmount = iPOOL(pool).baseAmount(); // Get SPARTA depth of pool
        uint totalSupply = iBEP20(pool).totalSupply(); // Get total supply of LPs
        return (totalSupply * amount) / ((amount + baseAmount) * 2);
    }

    //==================================== PRICING ====================================//

    function calcSpotValueInBase(address token, uint amount) external view returns (uint value){
        address pool = getPool(token); // Get pool address
        uint _baseAmount = iPOOL(pool).baseAmount(); // Get SPARTA depth of pool
        uint _tokenAmount = iPOOL(pool).tokenAmount(); // Get TOKEN depth of pool
        require(_tokenAmount > 0, '!DIVISION');
        return (amount * _baseAmount) / _tokenAmount;
    }

     function calcSpotValueInBaseWithSynth(address synth, uint amount) external view returns (uint value){
        address pool = iSYNTH(synth).POOL(); // Get pool address
        uint _baseAmount = iPOOL(pool).baseAmount(); // Get SPARTA depth of pool
        uint _tokenAmount = iPOOL(pool).tokenAmount(); // Get TOKEN depth of pool
        require(_tokenAmount > 0, '!DIVISION');
        return (amount * _baseAmount) / _tokenAmount;
    }
    function calcSwapValueInBase(address token, uint amount) external view returns (uint _output){
        address pool = getPool(token); // Get pool address
        uint _baseAmount = iPOOL(pool).baseAmount(); // Get SPARTA depth of pool
        uint _tokenAmount = iPOOL(pool).tokenAmount(); // Get TOKEN depth of pool
        return  calcSwapOutput(amount, _tokenAmount, _baseAmount);
    }

    function calcSwapValueInToken(address token, uint amount) external view returns (uint _output){
        address pool = getPool(token); // Get pool address
        uint _baseAmount = iPOOL(pool).baseAmount(); // Get SPARTA depth of pool
        uint _tokenAmount = iPOOL(pool).tokenAmount(); // Get TOKEN depth of pool
        return  calcSwapOutput(amount, _baseAmount, _tokenAmount);
    }

    function calcActualSynthUnits(address synth, uint amount) external view returns (uint _output) {
        address pool = iSYNTH(synth).POOL(); // Get pool address
        uint _baseAmount = iPOOL(pool).baseAmount(); // Get SPARTA depth of pool
        uint _tokenAmount = iPOOL(pool).tokenAmount(); // Get TOKEN depth of pool
        require(_tokenAmount > 0, '!DIVISION');
        return ((amount * _baseAmount) / (2 * _tokenAmount));
    }
}