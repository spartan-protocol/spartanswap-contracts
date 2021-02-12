// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./poolFactory.sol";
interface iPOOLCURATION {
    function isCuratedPool(address) external view returns (bool);
    function challengLowestCuratedPool(address) external  ;
    function addCuratedPool(address) external ;
    function removeCuratedPool(address) external  ;
    function isPool(address) external view returns (bool);
    function getPool(address) external view returns(address payable);
}

contract Router {
    using SafeMath for uint256;

    address public BASE;
    address public WBNB;
    address public DEPLOYER;

    uint public totalPooled; 
    uint public totalVolume;
    uint public totalFees;

    uint public secondsPerEra;
    uint public nextEraTime;
    uint public maxDebtAmount;
    uint public maxCreditAmount;
    uint public debtTotal;
    uint public creditTotal;
   
    uint public maxTrades;
    uint public eraLength;
    uint public normalAverageFee;
    uint public arrayFeeSize;
    uint [] public feeArray;
    
    event AddLiquidity(address member, uint inputBase, uint inputToken, uint unitsIssued);
    event RemoveLiquidity(address member, uint outputBase, uint outputToken, uint unitsClaimed);
    event Swapped(address tokenFrom, address tokenTo, uint inputAmount, uint transferAmount, uint outputAmount, uint fee, address recipient);
    event SwappedSynth(address tokenFrom, address tokenTo, uint inputAmount, uint outputAmount, uint fee, address recipient);

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER);
        _;
    }

    constructor (address _base, address _wbnb) public payable {
        BASE = _base;
        WBNB = _wbnb;
        arrayFeeSize = 20;
        eraLength = 30;
        maxTrades = 100;
        maxDebtAmount = 1000*10**18; // 1000 sparta
        maxCreditAmount = 1000*10**18; // 1000 sparta
        DEPLOYER = msg.sender;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    receive() external payable {}

    // In case of new router can migrate metrics
    function migrateRouterData(address payable oldRouter) public onlyDAO {
        totalPooled = Router(oldRouter).totalPooled();
        totalVolume = Router(oldRouter).totalVolume();
        normalAverageFee = Router(oldRouter).normalAverageFee();
    }

    // Add liquidity for self
    function addLiquidity(uint inputBase, uint inputToken, address token) public payable returns (uint units) {
        units = addLiquidityForMember(inputBase, inputToken, token, msg.sender);
        return units;
    }

    // Add liquidity for member
    function addLiquidityForMember(uint inputBase, uint inputToken, address token, address member) public payable returns (uint units) {
        address pool = iPOOLCURATION(_DAO().POOLCURATION()).getPool(token);
        uint256 _actualInputBase = _handleTransferIn(BASE, inputBase, pool);
        uint256 _actualInputtoken =  _handleTransferIn(token, inputToken, pool);
        totalPooled += _actualInputBase;
        units = Pool(pool).addLiquidityForMember(member);
        emit AddLiquidity(member, _actualInputBase,_actualInputtoken, units );
        return units;
    }
    function addLiquidityAsym(uint inputToken, bool fromBase, address token) public payable returns (uint units) {
       return addLiquidityAsymForMember(inputToken,fromBase, token, msg.sender);
    }
    // Add Asymmetrically
    function addLiquidityAsymForMember(uint inputToken, bool fromBase, address token, address member) public payable returns (uint units) {
        require(inputToken > 0);
        uint halfInput = inputToken.mul(5000).div(10000);
        if(!fromBase){
            (uint _baseBought, ) = swapTo(halfInput, token, BASE, member);
            units = addLiquidity(_baseBought, halfInput, token); 
        } else {
            (uint _tokenBought, ) = swapTo(halfInput, BASE, token,  member);
            units = addLiquidity(halfInput, _tokenBought, token); 
        }
        return units;
    }

    // Remove % for self
    function removeLiquidity(uint basisPoints, address token) public returns (uint outputBase, uint outputToken) {
        require((basisPoints > 0 && basisPoints <= 10000));
        uint _units = iUTILS(_DAO().UTILS()).calcPart(basisPoints, iBEP20(iPOOLCURATION(_DAO().POOLCURATION()).getPool(token)).balanceOf(msg.sender));
        return removeLiquidityExact(_units, token);
    }
    // Remove an exact qty of units
    function removeLiquidityExact(uint units, address token) public returns (uint outputBase, uint outputToken) {
        address _pool = iPOOLCURATION(_DAO().POOLCURATION()).getPool(token);
        require(iPOOLCURATION(_DAO().POOLCURATION()).isPool(_pool) == true);
        address _member = msg.sender;
        _handleTransferIn(_pool, units, _pool);
        (outputBase, outputToken) = Pool(_pool).removeLiquidityForMember(_member);
        totalPooled = totalPooled.sub(outputBase);
        emit RemoveLiquidity(_member,outputBase, outputToken,units);
        return (outputBase, outputToken);
    }

    function removeLiquidityAsym(uint units, bool toBase, address token) public returns (uint outputAmount){
        outputAmount = removeLiquidityAsymForMember(units, toBase, token, msg.sender);
        return outputAmount;
    }
    // Remove Asymmetrically
    function removeLiquidityAsymForMember(uint units, bool toBase, address token, address member) public returns (uint outputAmount){
        address pool = iPOOLCURATION(_DAO().POOLCURATION()).getPool(token);
        require(iPOOLCURATION(_DAO().POOLCURATION()).isPool(pool) == true);
        require(units < iBEP20(pool).totalSupply());
        _handleTransferIn(pool, units, pool);
        (uint _outputBase, uint _outputToken) = Pool(pool).removeLiquidityForMember(member);
        if(toBase){
            (uint _baseBought,) = swapTo(_outputToken,token, BASE, member);
            outputAmount = _baseBought.add(_outputBase);
        } else {
            (uint _tokenBought,) = swapTo(_outputBase, BASE,token, member);
            outputAmount = _tokenBought.add(_outputToken);
        }
        return outputAmount;
    }

    //==================================================================================//
    // Swapping Functions
    function buy(uint256 amount, address token) public returns (uint256 outputAmount, uint256 fee){
        return buyTo(amount, token, msg.sender);
    }
    function buyTo(uint amount, address token, address member) public returns (uint outputAmount, uint fee) {
        require(token != BASE);
        address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        address _pool = iPOOLCURATION(_DAO().POOLCURATION()).getPool(token);
        uint _actualAmount = _handleTransferIn(BASE, amount, _pool);
        (outputAmount, fee) = Pool(_pool).swap(_token);
        _handleTransferOut(token, outputAmount, member);
        totalPooled = totalPooled.add(_actualAmount);
        volumeDetails(_actualAmount, fee);
        return (outputAmount, fee);
    }
    function sell(uint amount, address token) public payable returns (uint outputAmount, uint fee){
        return sellTo(amount, token, msg.sender);
    }
    function sellTo(uint amount, address token, address member) public payable returns (uint outputAmount, uint fee) {
        require(token != BASE);
        address _pool = iPOOLCURATION(_DAO().POOLCURATION()).getPool(token);
        _handleTransferIn(token, amount, _pool);
        (outputAmount, fee) = Pool(_pool).swapTo(BASE, member);
        totalPooled = totalPooled.sub(outputAmount);
        volumeDetails(outputAmount, fee);
        return (outputAmount, fee);
    }
    function swap(uint256 inputAmount, address fromToken, address toToken) public payable returns (uint256 outputAmount, uint256 fee) {
        return swapTo(inputAmount, fromToken, toToken, msg.sender);
    }
    function swapTo(uint256 inputAmount, address fromToken, address toToken, address member) public payable returns (uint256 outputAmount, uint256 fee) {
        require(fromToken != toToken); address _pool;
        uint256 _transferAmount = 0;
        if(fromToken == BASE){
            (outputAmount, fee) = buyTo(inputAmount, toToken, member);
            _pool = iPOOLCURATION(_DAO().POOLCURATION()).getPool(toToken);
            getsDividend(_pool,toToken, fee);
        } else if(toToken == BASE) {
            (outputAmount, fee) = sellTo(inputAmount, fromToken, member);
            _pool = iPOOLCURATION(_DAO().POOLCURATION()).getPool(fromToken);
            getsDividend(_pool,fromToken, fee);
        } else {
            address _poolTo = iPOOLCURATION(_DAO().POOLCURATION()).getPool(toToken);
            (uint256 _yy, uint256 _feey) = sellTo(inputAmount, fromToken, _poolTo);
            totalVolume += _yy; totalFees += _feey;
            address _toToken = toToken;
             _pool = iPOOLCURATION(_DAO().POOLCURATION()).getPool(fromToken);
             getsDividend(_pool,fromToken, _feey);
            if(toToken == address(0)){_toToken = WBNB;} 
            (uint _zz, uint _feez) = Pool(_poolTo).swap(_toToken);
            getsDividend(_poolTo,_toToken, _feez);
            _handleTransferOut(toToken, _zz, member);
            totalFees += iUTILS(_DAO().UTILS()).calcSpotValueInBase(toToken, _feez);
            _transferAmount = _yy; outputAmount = _zz; 
            fee = _feez + iUTILS(_DAO().UTILS()).calcSpotValueInToken(toToken, _feey);
        }
        emit Swapped(fromToken, toToken, inputAmount, _transferAmount, outputAmount, fee, member);
        return (outputAmount, fee);
    }
    function getsDividend(address _pool, address _token, uint fee) internal {
        if(iPOOLCURATION(_DAO().POOLCURATION()).isCuratedPool(_pool) == true){
            addTradeFee(fee);
            addDividend(_token, fee); 
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
                actual = iBEP20(_token).balanceOf(_pool).sub(startBal);
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
    function swapSynthToBase(uint inputAmount, address synthIN) public returns (uint outPut){
        require(iSYNTHROUTER(_DAO().SYNTHROUTER()).isSynth(synthIN) == true);
        address synthINLayer1 = iSYNTH(synthIN).LayerONE();
        uint baseOut = iUTILS(_DAO().UTILS()).calcSwapValueInBase(synthINLayer1, inputAmount);
        debtTotal = debtTotal.add(baseOut); 
        require(debtTotal < maxDebtAmount, '!OVERMAXDEBT');
        address _poolIN = iPOOLCURATION(_DAO().POOLCURATION()).getPool(synthINLayer1);
        _handleTransferIn(synthIN, inputAmount, _poolIN);
        (uint outputBase, uint fee) = Pool(_poolIN).swapSynthIN(synthIN);
        volumeDetails(outputBase, fee);
        getsDividend(_poolIN, synthINLayer1, fee);
        _handleTransferOut(BASE, outputBase, msg.sender);
        emit SwappedSynth(synthIN, BASE, inputAmount, outputBase, fee, msg.sender);
        return outputBase;
    }
    function swapBaseToSynth(uint inputAmount, address synthOUT) public returns (uint outPut){
        require(iSYNTHROUTER(_DAO().SYNTHROUTER()).isSynth(synthOUT) == true);
        creditTotal = creditTotal.add(inputAmount); 
        require(creditTotal < maxCreditAmount, '!OVERMAXCREDIT');
        address synthOUTLayer1 = iSYNTH(synthOUT).LayerONE();
        address _poolOUT = iPOOLCURATION(_DAO().POOLCURATION()).getPool(synthOUTLayer1);
        require(iPOOLCURATION(_DAO().POOLCURATION()).isPool(_poolOUT) == true);
        _handleTransferIn(BASE, inputAmount, _poolOUT);
        (uint outputSynth, uint fee) = Pool(_poolOUT).swapSynthOUT(synthOUT);
        volumeDetails(inputAmount, fee);
        getsDividend( _poolOUT,  synthOUTLayer1,  fee);
        _handleTransferOut(synthOUT,outputSynth,msg.sender);
        emit SwappedSynth(BASE, synthOUT, inputAmount, outputSynth, fee, msg.sender);
        return outputSynth;
    }
    //==================================================================================//
    //Token Dividends / Curated Pools
    function addDividend(address _token, uint256 _fees) internal {
        if(!(normalAverageFee == 0)){
             uint reserve = iBEP20(BASE).balanceOf(address(this)); // get base balance
            if(!(reserve == 0)){
            address _pool = iPOOLCURATION(_DAO().POOLCURATION()).getPool(_token);
            uint dailyAllocation = reserve.div(eraLength).div(maxTrades); // get max dividend for reserve/30/100 
            uint numerator = _fees.mul(dailyAllocation);
            uint feeDividend = numerator.div(_fees.add(normalAverageFee));
            totalFees = totalFees.add(feeDividend);
            totalPooled = totalPooled.add(feeDividend); 
            iBEP20(BASE).transfer(_pool,feeDividend);   
            Pool(_pool).sync();
            }
        }
       
    }
    function addTradeFee(uint fee) internal returns (bool) {
        uint totalTradeFees = 0;
        uint arrayFeeLength = feeArray.length;
        if(!(arrayFeeLength == arrayFeeSize)){
            feeArray.push(fee);
        }else {
            addFee(fee);
            for(uint i = 0; i<arrayFeeSize; i++){
            totalTradeFees = totalTradeFees.add(feeArray[i]);
        }
        }
        normalAverageFee = totalTradeFees.div(arrayFeeSize); 
    }
    function addFee(uint fee) internal {
        uint n = feeArray.length;//20
        for (uint i = n - 1; i > 0; i--) {
        feeArray[i] = feeArray[i - 1];
        }
         feeArray[0] = fee;
    }

    function volumeDetails(uint inputAmount, uint fee) internal {
        totalVolume += inputAmount;
        totalFees += fee;
    }

    //=================================onlyDAO=====================================//
    function changeArrayFeeSize(uint _size) public onlyDAO {
        arrayFeeSize = _size;
    }
    function changeMaxTrades(uint _maxtrades) public onlyDAO {
        maxTrades = _maxtrades;
    }
    function changeMaxDebt(uint _maxDebt) public onlyDAO {
        maxDebtAmount = _maxDebt;
    }
    function changeMaxCredit(uint _maxCredit) public onlyDAO {
        maxCreditAmount = _maxCredit;
    }
    function forwardRouterFunds(address newRouterAddress ) public onlyDAO {
        uint balanceBase = iBEP20(BASE).balanceOf(address(this)); // get base balance
        iBEP20(BASE).transfer(newRouterAddress, balanceBase);
    }
    function grantFunds(uint amount, address grantee) public onlyDAO {
        require(amount < iBEP20(BASE).balanceOf(address(this)));
        require(grantee != address(0));
        iBEP20(BASE).transfer(grantee, amount);
    }

    function destroyPool(address pool) public onlyDAO {
         Pool(pool).destroyMe();  
    }
    function destroyRouter() public onlyDAO {
         selfdestruct(msg.sender);
    }


}