// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./interfaces/iBASE.sol";
import "./interfaces/iBEP20.sol";
import "./interfaces/iDAO.sol";
import "./interfaces/iPOOL.sol";
import "./interfaces/iSYNTH.sol";
import "./interfaces/iROUTER.sol";
import "./interfaces/iPOOLFACTORY.sol";
import "./interfaces/iSYNTHFACTORY.sol";


contract Utils {

    address public BASE;

    uint public one = 10**18;

    struct TokenDetails {
        string name;
        string symbol;
        uint decimals;
        uint totalSupply;
        uint balance;
        address tokenAddress;
    }

    struct ListedAssetDetails {
        string name;
        string symbol;
        uint decimals;
        uint totalSupply;
        uint balance;
        address tokenAddress;
        bool hasClaimed;
    }

    struct GlobalDetails {
        uint totalPooled;
        uint totalVolume;
        uint totalFees;
        uint removeLiquidityTx;
        uint addLiquidityTx;
        uint swapTx;
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

    struct SynthDataStruct {
        address tokenAddress;
        address synthAddress;
        uint genesis;
        uint totalDebt;
    }

    constructor (address _base) public payable {
        BASE = _base;
    }
     function _DAO() internal view returns (iDAO) {
        return iBASE(BASE).DAO();
    }

    //====================================DATA-HELPERS====================================//

    function getTokenDetails(address token) public view returns (TokenDetails memory tokenDetails){
        return getTokenDetailsWithMember(token, msg.sender);
    }

    function getTokenDetailsWithMember(address token, address member) public view returns (TokenDetails memory tokenDetails){
        if(token == address(0)){
            tokenDetails.name = 'Binance Coin';
            tokenDetails.symbol = 'BNB';
            tokenDetails.decimals = 18;
            tokenDetails.totalSupply = 100000000 * one;
            tokenDetails.balance = member.balance;
        } else {
            tokenDetails.name = iBEP20(token).name();
            tokenDetails.symbol = iBEP20(token).symbol();
            tokenDetails.decimals = iBEP20(token).decimals();
            tokenDetails.totalSupply = iBEP20(token).totalSupply();
            tokenDetails.balance = iBEP20(token).balanceOf(member);
        }
        tokenDetails.tokenAddress = token;
        return tokenDetails;
    }

    function tokenCount() public view returns (uint256 count){
        return iPOOLFACTORY(_DAO().POOLFACTORY()).tokenCount();
    }
    function allTokens() public view returns (address[] memory _allTokens){
        return tokensInRange(0, iPOOLFACTORY(_DAO().POOLFACTORY()).tokenCount()) ;
    }
    function tokensInRange(uint start, uint count) public view returns (address[] memory someTokens){
        if(start+(count) > tokenCount()){
            count = tokenCount()-(start);
        }
        address[] memory result = new address[](count);
        for (uint i = 0; i < count; i++){
            result[i] = iPOOLFACTORY(_DAO().POOLFACTORY()).getToken(i);
        }
        return result;
    }

    function poolCount() public view returns (uint256 count){
        return iPOOLFACTORY(_DAO().POOLFACTORY()).poolCount();
    }
    function allPools() public view returns (address[] memory _allPools){
        return poolsInRange(0, poolCount());
    }
    function poolsInRange(uint start, uint count) public view returns (address[] memory somePools){
        if(start+(count) > poolCount()){
            count = poolCount()-(start);
        }
        address[] memory result = new address[](count);
        for (uint i = 0; i<count; i++){
            result[i] = iPOOLFACTORY(_DAO().POOLFACTORY()).getPoolArray(i);
        }
        return result;
    }

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

    function getMemberShare(address token, address member) public view returns(uint baseAmount, uint tokenAmount){
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        uint units = iBEP20(pool).balanceOf(member);
        return getPoolShare(token, units);
    }

    function getPoolShare(address token, uint units) public view returns(uint baseAmount, uint tokenAmount){
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        baseAmount = calcShare(units, iBEP20(pool).totalSupply(), iPOOL(pool).baseAmount());
        tokenAmount = calcShare(units, iBEP20(pool).totalSupply(), iPOOL(pool).tokenAmount());
        return (baseAmount, tokenAmount);
    }
    function getMemberPoolShare(address pool, address member ) public view returns (uint baseAmount, uint tokenAmount){
        uint units = iBEP20(pool).balanceOf(member);
        baseAmount = calcShare(units, iBEP20(pool).totalSupply(), iPOOL(pool).baseAmount());
        tokenAmount = calcShare(units, iBEP20(pool).totalSupply(), iPOOL(pool).tokenAmount());
        return (baseAmount, tokenAmount);
    }


    function getPoolShareWeight(address token, uint units) public view returns(uint weight){
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        weight = calcShare(units, iBEP20(pool).totalSupply(), iPOOL(pool).baseAmount());
        return weight;
    }
    function getDepth(address _pool) public view returns (uint _baseAmount){
        _baseAmount = iPOOL(_pool).baseAmount();
          return _baseAmount;
    }


    function getShareOfBaseAmount(address token, address member) public view returns(uint baseAmount){
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        uint units = iBEP20(pool).balanceOf(member);
        return calcShare(units, iBEP20(pool).totalSupply(), iPOOL(pool).baseAmount());
    }
    function getShareOfTokenAmount(address token, address member) public view returns(uint baseAmount){
       address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        uint units = iBEP20(pool).balanceOf(member);
        return calcShare(units, iBEP20(pool).totalSupply(), iPOOL(pool).tokenAmount());
    }

    function getPoolShareAssym(address token, address member, bool toBase) public view returns(uint baseAmount, uint tokenAmount, uint outputAmt){
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        if(toBase){
            baseAmount = calcAsymmetricShare(pool, member);
            tokenAmount = 0;
            outputAmt = baseAmount;
        } else {
            baseAmount = 0;
            tokenAmount = calcAsymmetricShare(pool, member);
            outputAmt = tokenAmount;
        }
        return (baseAmount, tokenAmount, outputAmt);
    }

    function getPoolAge(address token) public view returns (uint daysSinceGenesis){
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        uint genesis = iPOOL(pool).genesis();
        if(block.timestamp  < genesis+(86400)){
            return 1;
        } else {
            return (block.timestamp -(genesis))/(86400);
        }
    }

    function isMember(address token, address member) public view returns(bool){
       address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        if (iBEP20(pool).balanceOf(member) > 0){
            return true;
        } else {
            return false;
        }
    }


    //=================================== SYNTH DATA =================================//

     function getSynth(address token) public view returns(address synth){
        return iSYNTHFACTORY(_DAO().SYNTHFACTORY()).getSynth(token);   
    }
    
    function getSynthData(address token) public view returns(SynthDataStruct memory synthData){
        address synth = getSynth(token);
        synthData.synthAddress = synth;
        synthData.tokenAddress = token;
        synthData.genesis = iSYNTH(synth).genesis();
        synthData.totalDebt = iSYNTH(synth).totalMinted(); 
        return synthData;
    }

     function calcDebtShare(uint units, uint totalSupply, address lpToken, address synth) public view returns (uint share){
        // share = amount * part/total
        uint amount = iBEP20(lpToken).balanceOf(synth);
        return(amount*(units))/(totalSupply);
    }


    function curatedPoolCount() public view returns(uint count){
        return iPOOLFACTORY(_DAO().POOLFACTORY()).getCuratedPoolsLength();
    }

    function allCuratedPools() public view returns (address[] memory _allCuratedPools){
        return curatedPoolsInRange(0, curatedPoolCount());
    }
    function curatedPoolsInRange(uint start, uint count) public view returns (address[] memory someCuratedPools){
        if(start+(count) > curatedPoolCount()){
            count = curatedPoolCount()-(start);
        }
        address[] memory result = new address[](count);
        for (uint i = 0; i<count; i++){
            result[i] = iPOOLFACTORY(_DAO().POOLFACTORY()).getCuratedPool(i);
        }
        return result;
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

    function calcBasisPoints(uint input, address token, address member) public view returns (uint part){
        // 10,000 basis points = 100.00%
         uint amount = iBEP20(token).balanceOf(member);
        return(input / amount)*(10000);
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
        uint numerator = x*(X*(Y));
        uint denominator = (x+(X))*(x+(X));
        return numerator/(denominator);
    }

    function  calcSwapFee(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * x * Y) / (x + X)^2
        uint numerator = x*(x*(Y));
        uint denominator = (x+(X))*(x+(X));
        return numerator/(denominator);
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
            uint _units = (P*(part1+(part2)))/(part3);
            return _units*(slipAdjustment)/(one);  // Divide by 10**18
        }
    }

    function getSlipAdustment(uint b, uint B, uint t, uint T) public view returns (uint slipAdjustment){
        // slipAdjustment = (1 - ABS((B t - b T)/((2 b + B) (t + T))))
        // 1 - ABS(part1 - part2)/(part3 * part4))
        uint part1 = B*(t);
        uint part2 = b*(T);
        uint part3 = b*(2)+(B);
        uint part4 = t+(T);
        uint numerator;
        if(part1 > part2){
            numerator = part1-(part2);
        } else {
            numerator = part2-(part1);
        }
        uint denominator = part3*(part4);
        return one-((numerator*(one))/(denominator)); // Multiply by 10**18
    }

     function calcAsymmetricShare(address pool, address member) public view returns (uint share){
       (uint baseAmount, uint tokenAmount) = getMemberPoolShare(pool, member);
        uint tokenSwapped = calcSwapValueInBaseWithPool(pool, tokenAmount);
        share = baseAmount+(tokenSwapped);
        return share;
    }

    function calcAsymmetricValueBase(address pool, uint amount) public view returns (uint baseValue){
        uint baseAmount = calcShare(amount, iBEP20(pool).totalSupply(), iPOOL(pool).baseAmount());
        uint tokenAmount = calcShare(amount, iBEP20(pool).totalSupply(), iPOOL(pool).tokenAmount());
        uint tokenSwapped = calcSwapValueInBaseWithPool(pool, tokenAmount);
        baseValue = baseAmount+(tokenSwapped);
        return baseValue;
    }
     function calcAsymmetricValueToken(address pool, uint amount) public view returns (uint tokenValue){
        uint baseAmount = calcShare(amount, iBEP20(pool).totalSupply(), iPOOL(pool).baseAmount());
        uint tokenAmount = calcShare(amount, iBEP20(pool).totalSupply(), iPOOL(pool).tokenAmount());
        uint baseSwapped = calcSwapValueInTokenWithPool(pool, baseAmount);
        tokenValue = tokenAmount+(baseSwapped);
        return tokenValue;
    }
    function calcAsymmetricSpotValueBase(address pool, uint amount) public view returns (uint baseValue){
         uint baseAmount = calcShare(amount, iBEP20(pool).totalSupply(), iPOOL(pool).baseAmount());
        uint tokenAmount = calcShare(amount, iBEP20(pool).totalSupply(), iPOOL(pool).tokenAmount());
        uint tokenSwapped = calcSpotValueInBaseWithPool(pool, tokenAmount);
        baseValue = baseAmount+(tokenSwapped);
        return baseValue;
    }
    function calcSynthsValue(address pool, uint amount) public view returns (uint units){
        uint amountHalved = amount/(2);
        uint baseSwapped = calcSwapValueInBaseWithPool(pool, amountHalved);
        uint baseAmount = iPOOL(pool).baseAmount();
        uint tokenAmount = iPOOL(pool).tokenAmount();
        uint totalSupply = iBEP20(pool).totalSupply();
        units = calcLiquidityUnits(baseSwapped, baseAmount, amountHalved, tokenAmount, totalSupply);
        return units;
    }
     function calcCDPValue(address synth) public view returns (uint cdpValue){
         uint cdpBase = 0;
         address [] memory getCuratedPools =  allCuratedPools();
         for(uint i=0;i<getCuratedPools.length;i++){
             uint lpTokenBalance = iBEP20(getCuratedPools[i]).balanceOf(synth);
             uint baseAmount = calcShare(lpTokenBalance, iBEP20(getCuratedPools[i]).totalSupply(), iPOOL(getCuratedPools[i]).baseAmount());
             uint tokenAmount = calcShare(lpTokenBalance, iBEP20(getCuratedPools[i]).totalSupply(), iPOOL(getCuratedPools[i]).tokenAmount());
             uint tokenSwapped = calcSwapValueInBaseWithPool(getCuratedPools[i], tokenAmount);
             cdpBase = cdpBase+(baseAmount+(tokenSwapped));
         }
         cdpValue = cdpBase;
         return cdpValue;
     }
     //synthUnits += (P b)/(2 (b + B))
     function calcLiquidityUnitsAsym(uint Amount, address pool) public view returns (uint units){
        uint baseAmount = iPOOL(pool).baseAmount();
        uint totalSupply = iBEP20(pool).totalSupply();
        uint two = 2;
         return (totalSupply*(Amount))/((two*(Amount+(baseAmount))));
     }


}