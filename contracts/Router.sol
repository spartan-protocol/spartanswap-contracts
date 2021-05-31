// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./Pool.sol";
import "./iRESERVE.sol"; 
import "./iPOOLFACTORY.sol";  
import "./iWBNB.sol";

contract Router {

    address public BASE;
    address public WBNB;
    address public DEPLOYER;

    uint public secondsPerEra;
    uint public nextEraTime;
    uint private maxTrades;
    uint private eraLength;
    uint public normalAverageFee;
    uint private arrayFeeSize;
    uint [] private feeArray;
    uint private lastMonth;

    mapping(address=> uint) public mapAddress_30DayDividends;
    mapping(address=> uint) public mapAddress_Past30DayPoolDividends;

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER);
        _;
    }

    constructor (address _base, address _wbnb) {
        BASE = _base;
        WBNB = _wbnb;
        arrayFeeSize = 20;
        eraLength = 30;
        maxTrades = 100;
        lastMonth = 0;
        DEPLOYER = msg.sender;
    }

    receive() external payable {}

    function _DAO() internal view returns(iDAO) {
         return iBASE(BASE).DAO();
    }

    // Add liquidity for self
    function addLiquidity(uint inputBase, uint inputToken, address token) external payable returns (uint units) {
        units = addLiquidityForMember(inputBase, inputToken, token, msg.sender);
        return units;
    }

    // Add liquidity for member
    function addLiquidityForMember(uint inputBase, uint inputToken, address token, address member) public payable returns (uint units) {
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token); 
        _handleTransferIn(BASE, inputBase, pool);
        _handleTransferIn(token, inputToken, pool);
        units = Pool(pool).addForMember(member);
        return units;
    }

    function zapLiquidity(uint unitsInput, address fromPool, address toPool) external returns (uint unitsOutput){
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(fromPool) == true);
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(toPool) == true);
        address _fromToken = Pool(fromPool).TOKEN();
        address _member = msg.sender; 
        require(unitsInput <= iBEP20(fromPool).totalSupply());
        iBEP20(fromPool).transferFrom(_member, fromPool, unitsInput); // get lps
        (, uint outputToken) = Pool(fromPool).remove(); // remove 
        iBEP20(_fromToken).transfer(fromPool, outputToken); // transfer fromToken for swap
        Pool(fromPool).swapTo(BASE,toPool); // swap to BASE > transfer to toPOOL
        iBEP20(BASE).transfer(toPool, iBEP20(BASE).balanceOf(address(this))); // transfer fromToken for swap
        unitsOutput = Pool(toPool).addForMember(_member); //capture lps
        return (unitsOutput);
    }

     function addLiquiditySingle(uint inputToken, bool fromBase, address token) external payable returns (uint units) {
       return addLiquiditySingleForMember(inputToken,fromBase, token, msg.sender);
    }
    // Add Asymmetrically
    function addLiquiditySingleForMember(uint inputToken, bool fromBase, address token, address member) public payable returns (uint units) {
        require(inputToken > 0);
         address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
         address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        if(fromBase){
             _handleTransferIn(BASE, inputToken, _pool);
             units = Pool(_pool).addForMember(member);
        } else {
            _handleTransferIn(token, inputToken, _pool);
            units = Pool(_pool).addForMember(member);
        }
        return units;
    }
    // Remove % for self
    function removeLiquidity(uint basisPoints, address token) external returns (uint outputBase, uint outputToken)  {
        require((basisPoints > 0 && basisPoints <= 10000));
        uint _units = iUTILS(_DAO().UTILS()).calcPart(basisPoints, iBEP20(iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token)).balanceOf(msg.sender));
       return removeLiquidityExact(_units, token);
    }
    // Remove an exact qty of units
    function removeLiquidityExact(uint units, address token) public returns (uint outputBase, uint outputToken) {
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        address _member = msg.sender;
        iBEP20(_pool).transferFrom(_member, _pool, units);
         if(token != address(0)){
             Pool(_pool).removeForMember(_member);
         }else{
             (, outputToken) = Pool(_pool).remove();
             outputBase = iBEP20(BASE).balanceOf(address(this));
             _handleTransferOut(token, outputToken,_member);
             _handleTransferOut(BASE, outputBase, _member);
         }
        return (outputBase, outputToken);
    }

    // Remove Asymmetrically
    function removeLiquiditySingle(uint units, bool toBase, address token) external returns (uint fee){
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(_pool) == true);
        address _member = msg.sender;
        iBEP20(_pool).transferFrom(_member, _pool, units);
        (, uint outputToken) = Pool(_pool).remove();
        address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        if(toBase){
             iBEP20(_token).transfer(_pool, outputToken);
             (,uint _feey) = Pool(_pool).swap(BASE);
             fee = _feey;
             _handleTransferOut(BASE, iBEP20(BASE).balanceOf(address(this)), _member);
        } else {
             iBEP20(BASE).transfer(_pool, iBEP20(BASE).balanceOf(address(this)));
             (uint _tokenBought,uint _feez) = Pool(_pool).swap(_token);
             fee = _feez;
             _handleTransferOut(token, (_tokenBought + outputToken), _member);
        } 
        return fee;
    }

    //==================================================================================//
    // Swapping Functions
    function buyTo(uint amount, address token, address member) public returns (uint){
        address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        _handleTransferIn(BASE, amount, _pool);
        (uint outputAmount, uint fee ) = Pool(_pool).swap(_token);
        _handleTransferOut(token, outputAmount, member);
        getsDividend(_pool, fee);
        return fee;
    }
    function sellTo(uint amount, address token, address member) public payable returns (uint){
         address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
         _handleTransferIn(token, amount, _pool);
         (, uint fee) = Pool(_pool).swapTo(BASE, member);
         getsDividend(_pool,fee);
         return fee;
    }
    function swap(uint256 inputAmount, address fromToken, address toToken) public payable {
        swapTo(inputAmount, fromToken, toToken, msg.sender);
    }
    function swapTo(uint256 inputAmount, address fromToken, address toToken, address member) public payable{
        require(fromToken != toToken);
        if(fromToken == BASE){
                buyTo(inputAmount, toToken, member);   
        } else if(toToken == BASE) {
                sellTo(inputAmount, fromToken, member); 
        } else {
            address _poolTo = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(toToken);
            uint feey = sellTo(inputAmount, fromToken, _poolTo);
            address _toToken = toToken;
            if(toToken == address(0)){_toToken = WBNB;} 
             (uint _zz, uint _feez) = Pool(_poolTo).swap(_toToken);
            uint fee = feey+(_feez);
            getsDividend(_poolTo,fee);
            _handleTransferOut(toToken, _zz, member);
        }
    }
    function getsDividend(address _pool, uint fee) internal {
        if(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_pool) == true){
            addTradeFee(fee);
            addDividend(_pool, fee); 
           }
    }
    //==================================================================================//
    // Token Transfer Functions
    function _handleTransferIn(address _token, uint256 _amount, address _pool) internal returns(uint256 actual){
        if(_amount > 0) {
            if(_token == address(0)){
                require((_amount == msg.value));
                payable(WBNB).call{value:_amount}(""); 
                iBEP20(WBNB).transfer(_pool, _amount); 
                actual = _amount;
            } else {
                uint startBal = iBEP20(_token).balanceOf(_pool);
                iBEP20(_token).transferFrom(msg.sender, _pool, _amount); 
                actual = iBEP20(_token).balanceOf(_pool)-(startBal);
            }
        }
    }
    function _handleTransferOut(address _token, uint256 _amount, address _recipient) internal {
        if(_amount > 0) {
            if (_token == address(0)) {
                iWBNB(WBNB).withdraw(_amount);
                payable(_recipient).call{value:_amount}(""); 
            } else {
                iBEP20(_token).transfer(_recipient, _amount);
            }
        }
    }
    //=================================================================================//
    //Swap Synths

    function swapAssetToSynth(uint inputAmount, address fromToken, address toSynth) public payable returns (uint outputSynth, uint fee){
         require(fromToken != toSynth);
         address _synthLayer1 = iSYNTH(toSynth).LayerONE();
         address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(_synthLayer1);
          if(fromToken != BASE){
            sellTo(inputAmount, fromToken, address(this));
            iBEP20(BASE).transfer(_pool, iBEP20(BASE).balanceOf(address(this)));
          }else {
            iBEP20(BASE).transferFrom(msg.sender, _pool, inputAmount); 
          }
          (outputSynth, fee) = Pool(_pool).mintSynth(toSynth, msg.sender); 
          getsDividend(_pool, fee);
         return (outputSynth,fee);
    }
   

    function swapSynthToAsset(uint inputAmount, address fromSynth, address toToken) public returns (uint outputAmount, uint fee){
        require(fromSynth != toToken);
        address _synthINLayer1 = iSYNTH(fromSynth).LayerONE();
        address _poolIN = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(_synthINLayer1);
        address _toToken = toToken;
        if(toToken == address(0)){_toToken = WBNB;} // Handle BNB
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(_toToken);
        iBEP20(fromSynth).transferFrom(msg.sender, _poolIN, inputAmount); 
        if(_toToken != BASE){
            Pool(_poolIN).burnSynth(fromSynth, address(this)); 
            iBEP20(BASE).transfer(_pool, iBEP20(BASE).balanceOf(address(this)));
            (outputAmount, fee) = Pool(_pool).swap(_toToken);
            _handleTransferOut(toToken, outputAmount, msg.sender);
        }else{
            (outputAmount, fee) = Pool(_poolIN).burnSynth(fromSynth, msg.sender); 
        }
            getsDividend(_pool, fee);
        return (outputAmount, fee);
    }
    
    //==================================================================================//
    //Token Dividends / Curated Pools
    function addDividend(address _pool, uint256 _fees) internal {
        if(!(normalAverageFee == 0)){
             uint reserve = iBEP20(BASE).balanceOf(_DAO().RESERVE()); // get base balance
            if(!(reserve == 0)){
            uint dailyAllocation = (reserve / eraLength) / maxTrades; // get max dividend for reserve/30/100 
            uint numerator = _fees * dailyAllocation;
            uint feeDividend = numerator / (_fees + normalAverageFee);
            revenueDetails(feeDividend,_pool);
            iRESERVE(_DAO().RESERVE()).grantFunds(feeDividend, _pool);   
            Pool(_pool).sync();
            }
        }
       
    }
    function addTradeFee(uint _fee) internal {
        uint totalTradeFees = 0;
        uint arrayFeeLength = feeArray.length;
        if(!(arrayFeeLength == arrayFeeSize)){
            feeArray.push(_fee);
        }else {
            addFee(_fee);
            for(uint i = 0; i<arrayFeeSize; i++){
            totalTradeFees = totalTradeFees+(feeArray[i]);
        }
        }
        normalAverageFee = totalTradeFees / arrayFeeSize; 
    }
    function addFee(uint _fee) internal {
        uint n = feeArray.length;//20
        for (uint i = n - 1; i > 0; i--) {
        feeArray[i] = feeArray[i - 1];
        }
         feeArray[0] = _fee;
    }
    function revenueDetails(uint _fees, address _pool) internal {
        if(lastMonth == 0){
            lastMonth = Pool(_pool).genesis();
        }
        if(block.timestamp <= lastMonth + 2592000){//30days
            mapAddress_30DayDividends[_pool] = mapAddress_30DayDividends[_pool] + _fees;
        }else{
            lastMonth = lastMonth + 2592000;
            mapAddress_Past30DayPoolDividends[_pool] = mapAddress_30DayDividends[_pool];
            mapAddress_30DayDividends[_pool] = 0;
            mapAddress_30DayDividends[_pool] = mapAddress_30DayDividends[_pool] + _fees;
        }
    }

    function stringToBytes(string memory s) public pure returns (bytes memory){
        return bytes(s);
    }
    function isEqual(bytes memory part1, bytes memory part2) public pure returns(bool equal){
        if(sha256(part1) == sha256(part2)){
            return true;
        }
    }
    
    //=================================onlyDAO=====================================//
    function changeArrayFeeSize(uint _size) public onlyDAO {
        arrayFeeSize = _size;
    }
    function changeMaxTrades(uint _maxtrades) public onlyDAO {
        maxTrades = _maxtrades;
    }
    function changeEraLength(uint _eraLength) public onlyDAO {	
        eraLength = _eraLength;	
    }
    //==================================Helpers=================================//
    function currentPoolRevenue(address pool) external view returns(uint256) {
      return mapAddress_30DayDividends[pool];
    }
    function pastPoolRevenue(address pool) external view returns(uint256) {
      return mapAddress_Past30DayPoolDividends[pool];
    }


}