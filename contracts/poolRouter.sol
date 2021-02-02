// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./IContracts.sol";
import "./poolFactory.sol";
import "@nomiclabs/buidler/console.sol";

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
    bool public emitting;
    address public incentiveAddress;
    uint32 private BP = 10000;
   
    uint public maxTrades;
    uint public eraLength;
    uint public normalAverageFee;
    uint public arrayFeeSize;
    uint public curatedPoolSize;
    uint [] public feeArray;

    address[] public arrayTokens;
    address[] public curatedPools;
    address[] public arrayPools;
    mapping(address=>address) private mapToken_Pool;
    mapping(address=>bool) public isPool;
    mapping(address=>bool) public isCuratedPool;

    event NewPool(address token, address pool, uint genesis);
    event AddLiquidity(address member, uint inputBase, uint inputToken, uint unitsIssued);
    event RemoveLiquidity(address member, uint outputBase, uint outputToken, uint unitsClaimed);
    event Swapped(address tokenFrom, address tokenTo, uint inputAmount, uint transferAmount, uint outputAmount, uint fee, address recipient);
    event SwappedSynth(address tokenFrom, address tokenTo, uint inputAmount, uint outputAmount, uint fee, address recipient)

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "!DAO");
        _;
    }

    constructor (address _base, address _wbnb) public payable {
        BASE = _base;
        WBNB = _wbnb;
        arrayFeeSize = 20;
        curatedPoolSize = 10;
        eraLength = 30;
        maxTrades = 100;
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

    function migrateTokenData(address payable oldRouter) public onlyDAO {
        uint256 tokenCount = Router(oldRouter).tokenCount();
        for(uint256 i = 0; i<tokenCount; i++){
            address token = Router(oldRouter).getToken(i);
            address pool = Router(oldRouter).getPool(token);
            isPool[pool] = true;
            arrayTokens.push(token);
            arrayPools.push(pool);
            mapToken_Pool[token] = pool;
        }
    }

    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }

    function createPool(uint256 inputBase, uint256 inputToken, address token) public payable returns(address pool){
        require(getPool(token) == address(0), "CreateErr");
        require(token != BASE, "Base");
        require((inputToken > 0 && inputBase > 0), "GetTokens");
        require(iBEP20(token).decimals() == 18, '!18D');
        Pool newPool; address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        newPool = new Pool(BASE, _token); 
        pool = address(newPool);
        mapToken_Pool[_token] = pool;
        uint256 _actualInputBase = _handleTransferIn(BASE, inputBase, pool);
        _handleTransferIn(token, inputToken, pool);
        arrayTokens.push(_token); 
        isPool[pool] = true;
        totalPooled += _actualInputBase;
        Pool(pool).addLiquidityForMember(msg.sender);
        emit NewPool(token, pool, now);
        return pool;
    }

    //==================================================================================//
    // Add/Remove Liquidity functions

    // Add liquidity for self
    function addLiquidity(uint inputBase, uint inputToken, address token) public payable returns (uint units) {
        units = addLiquidityForMember(inputBase, inputToken, token, msg.sender);
        return units;
    }

    // Add liquidity for member
    function addLiquidityForMember(uint inputBase, uint inputToken, address token, address member) public payable returns (uint units) {
        address pool = getPool(token);
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
        require(inputToken > 0, "InputErr");
        if(!fromBase){
            uint halfInput = inputToken.mul(5000).div(10000);
            (uint _baseBought, uint _fee) = swapTo(inputToken, token, BASE, member);
            units = addLiquidityForMember(_baseBought, halfInput, token, member); 
        } else {
            uint halfInput = inputToken.mul(5000).div(10000);
            (uint _tokenBought, uint _fee) = swapTo(inputToken, BASE, token,  member);
            units = addLiquidityForMember(halfInput, _tokenBought, token, member); 
        }
        return units;
    }


    // Remove % for self
    function removeLiquidity(uint basisPoints, address token) public returns (uint outputBase, uint outputToken) {
        require((basisPoints > 0 && basisPoints <= 10000), "InputErr");
        uint _units = iUTILS(_DAO().UTILS()).calcPart(basisPoints, iBEP20(getPool(token)).balanceOf(msg.sender));
        return removeLiquidityExact(_units, token);
    }
    // Remove an exact qty of units
    function removeLiquidityExact(uint units, address token) public returns (uint outputBase, uint outputToken) {
        address _pool = getPool(token);
        require(isPool[_pool] = true, '!pool');
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
        address pool = getPool(token);
        require(isPool[pool] = true, '!pool');
        require(units < iBEP20(pool).totalSupply(), "InputErr");
        _handleTransferIn(pool, units, pool);
        (uint _outputBase, uint _outputToken) = Pool(pool).removeLiquidityForMember(member);
        if(toBase){
            (uint _baseBought, uint _fee) = swapTo(_outputToken,token, BASE, member);
            outputAmount = _baseBought.add(_outputBase);
        } else {
            (uint _tokenBought, uint _fee) = swapTo(_outputBase, BASE,token, member);
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
        require(token != BASE, "TokenTypeErr");
        address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        address _pool = getPool(token);
        uint _actualAmount = _handleTransferIn(BASE, amount, _pool);
        (outputAmount, fee) = Pool(_pool).swap(_token);
        _handleTransferOut(token, outputAmount, member);
        totalPooled += _actualAmount;
        totalVolume += _actualAmount;
        totalFees += iUTILS(_DAO().UTILS()).calcSpotValueInBase(token, fee);
        return (outputAmount, fee);
    }
    function sell(uint amount, address token) public payable returns (uint outputAmount, uint fee){
        return sellTo(amount, token, msg.sender);
    }
    function sellTo(uint amount, address token, address member) public payable returns (uint outputAmount, uint fee) {
        require(token != BASE, "TokenTypeErr");
        address _pool = getPool(token);
        _handleTransferIn(token, amount, _pool);
        (outputAmount, fee) = Pool(_pool).swapTo(BASE, member);
        totalPooled = totalPooled.sub(outputAmount);
        totalVolume += outputAmount;
        totalFees += fee;
        return (outputAmount, fee);
    }
    function swap(uint256 inputAmount, address fromToken, address toToken) public payable returns (uint256 outputAmount, uint256 fee) {
        return swapTo(inputAmount, fromToken, toToken, msg.sender);
    }
    function swapTo(uint256 inputAmount, address fromToken, address toToken, address member) public payable returns (uint256 outputAmount, uint256 fee) {
        require(fromToken != toToken, "TokenTypeErr"); address _pool;
        uint256 _transferAmount = 0;
        if(fromToken == BASE){
            (outputAmount, fee) = buyTo(inputAmount, toToken, member);
            _pool = getPool(toToken);
           if(isCuratedPool[_pool]){
            addTradeFee(fee);//add fee to feeArray
            addDividend(toToken, fee); //add dividend
           }
        } else if(toToken == BASE) {
            (outputAmount, fee) = sellTo(inputAmount, fromToken, member);
            _pool = getPool(fromToken);
            if(isCuratedPool[_pool]){
            addTradeFee(fee);//add fee to feeArray
            addDividend(fromToken, fee);
            }
        } else {
            address _poolTo = getPool(toToken);
            (uint256 _yy, uint256 _feey) = sellTo(inputAmount, fromToken, _poolTo);
            totalVolume += _yy; totalFees += _feey;
            address _toToken = toToken;
             _pool = getPool(fromToken);
            if(isCuratedPool[_pool]){
            addTradeFee(_feey);//add fee to feeArray
            addDividend(fromToken, _feey);
            }
            if(toToken == address(0)){_toToken = WBNB;} // Handle BNB
            (uint _zz, uint _feez) = Pool(_poolTo).swap(_toToken);
            if(isCuratedPool[_poolTo]){
            addTradeFee(_feez);//add fee to feeArray
            addDividend(_toToken,  _feez);
            }
            _handleTransferOut(toToken, _zz, member);
            totalFees += iUTILS(_DAO().UTILS()).calcSpotValueInBase(toToken, _feez);
            _transferAmount = _yy; outputAmount = _zz; 
            fee = _feez + iUTILS(_DAO().UTILS()).calcSpotValueInToken(toToken, _feey);
        }
        emit Swapped(fromToken, toToken, inputAmount, _transferAmount, outputAmount, fee, member);
        return (outputAmount, fee);
    }

    //==================================================================================//
    // Token Transfer Functions
    function _handleTransferIn(address _token, uint256 _amount, address _pool) internal returns(uint256 actual){
        if(_amount > 0) {
            if(_token == address(0)){
                // If BNB, then send to WBNB contract, then forward WBNB to pool
                require((_amount == msg.value), "InputErr");
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
                // If BNB, then withdraw to BNB, then forward BNB to recipient
                iWBNB(WBNB).withdraw(_amount);
                payable(_recipient).call{value:_amount}(""); 
            } else {
                iBEP20(_token).transfer(_recipient, _amount);
            }
        }
    }

    //=================================================================================//
    //Swap Synths
    function swapSynthToBase(uint inputAmount, address synthIN) internal returns (uint outPut){
        require(iSYNTHROUTER(_DAO().SYNTHROUTER()).isSynth(synthIN) == true, "!SYNTH");
        address synthINLayer1 = iSYNTH(synthIN).LayerONE();
        address _poolIN = mapToken_Pool[synthINLayer1];
        _handleTransferIn(synthIN, inputAmount, _poolIN);
        (uint outPutBase, uint fee) = Pool(_poolIN).swapSynthIn(synthIN, _pool);
        totalPooled = totalPooled.sub(outputAmount);
        totalVolume += outputAmount;
        totalFees += fee;
        _handleTransferOut(BASE, outPutBase, msg.sender);
        emit SwappedSynth(synthIN, BASE, inputAmount, outPutBase, fee, msg.sender);
        return outPut;
    }
    function swapBaseToSynth(uint inputAmount, address synthOUT) public returns (uint outPut){
        require(iSYNTHROUTER(_DAO().SYNTHROUTER()).isSynth(synthOUT) == true, "!SYNTH");
        address synthOUTLayer1 = iSYNTH(synthOUT).LayerONE();
        address _poolOUT = mapToken_Pool[synthOUTLayer1];
        require(iROUTER(_DAO().ROUTER()).isPool(_poolOUT) == true, "!SYNTH");
        _handleTransferIn(BASE, inputAmount, _poolOUT);
        (uint outputSynth, uint fee) = Pool(_poolOUT).swapSynthOUT(BASEIN, _poolOUT);
        totalPooled = totalPooled.add(inputAmount);
        totalVolume += inputAmount;
        totalFees += fee;
        _handleTransferOut(synthOUT,outputSynth,msg.sender);
        emit SwappedSynth(synthIN, synthOUT, inputAmount, outPutBase, fee, msg.sender);
        return outPut;
    }






    //==================================================================================//
    //Token Dividends / Curated Pools
    function addDividend(address _token, uint256 _fees) internal returns (bool){
        if(!(normalAverageFee == 0)){
             uint reserve = iBEP20(BASE).balanceOf(address(this)); // get base balance
            if(!(reserve == 0)){
            address _pool = getPool(_token);
            uint dailyAllocation = reserve.div(eraLength).div(maxTrades); // get max dividend for reserve/30/100 
            uint numerator = _fees.mul(dailyAllocation);
            uint feeDividend = numerator.div(_fees.add(normalAverageFee));
            totalFees = totalFees.add(feeDividend);
            iBEP20(BASE).transfer(_pool,feeDividend);   
            Pool(_pool).sync();
            }
        return true;
        }
       
    }
    function addTradeFee(uint fee) internal returns (bool) {
        uint totalTradeFees = 0;
        uint arrayFeeLength = getTradeLength();
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
    function addFee(uint fee) internal returns(bool) {
        uint n = feeArray.length;//20
        for (uint i = n - 1; i > 0; i--) {
        feeArray[i] = feeArray[i - 1];
        }
         feeArray[0] = fee;
        return true;
    }
    function sortDescCuratedPoolsByDepth() internal returns (bool){
         for (uint i = 0; i < curatedPools.length; ++i) 
        {
            for (uint j = i + 1; j < curatedPools.length; ++j) 
            {
                uint iDepth = iUTILS(_DAO().UTILS()).getDepth(curatedPools[i]);
                uint jDepth = iUTILS(_DAO().UTILS()).getDepth(curatedPools[j]);
                if (iDepth < jDepth) 
                {
                    address a = curatedPools[i];
                    curatedPools[i] = curatedPools[j];
                    curatedPools[j] = a;
                }
            }
        }
        return true;
    }
    function challengLowestCuratedPool(address token) public onlyDAO returns (bool) {
         address _pool = getPool(token);
         require(isPool[_pool] == true, '!pool');
         sortDescCuratedPoolsByDepth();
         uint challenger = iUTILS(_DAO().UTILS()).getDepth(_pool);
         uint lowestCurated = iUTILS(_DAO().UTILS()).getDepth(curatedPools[curatedPools.length - 1]);
        if(challenger > lowestCurated){
            address loser = curatedPools[curatedPools.length - 1];
            address winner = _pool;
            curatedPools.pop();
            isCuratedPool[winner] = true;
            curatedPools.push(winner);
            isCuratedPool[loser] = false;
        }
        return true;
    }

    //=================================onlyDAO=====================================//
    function changeArrayFeeSize(uint _size) public onlyDAO returns(bool){
        arrayFeeSize = _size;
        return true;
    }
    function changeMaxTrades(uint _maxtrades) public onlyDAO returns(bool){
        maxTrades = _maxtrades;
        return true;
    }
    function forwardRouterFunds(address newRouterAddress ) public onlyDAO returns(bool){
        uint balanceBase = iBEP20(BASE).balanceOf(address(this)); // get base balance
        iBEP20(BASE).transfer(newRouterAddress, balanceBase);
        return true;
    }
    function grantFunds(uint amount, address grantee) public onlyDAO returns (bool){
        require(amount < iBEP20(BASE).balanceOf(address(this)), "!Balance");
        require(grantee != address(0), 'GrantERR');
        iBEP20(BASE).transfer(grantee, amount);
        return true;
    }
    function addCuratedPool(address token) public onlyDAO returns (bool){
        require(token != BASE, 'Base');
        address _pool = getPool(token);
        require(isPool[_pool] == true, '!Pool');
        isCuratedPool[_pool] = true;
        curatedPools.push(_pool);
        return true;
    }
    function removeCuratedPool(address token) public onlyDAO returns (bool){
        require(token != BASE, 'Base');
        address _pool = getPool(token);
        require(isCuratedPool[_pool] == true, '!Pool');
        isCuratedPool[_pool] = false;
        return true;
    }

    //======================================HELPERS========================================//
    // Helper Functions
    function getPool(address token) public view returns(address pool){
        if(token == address(0)){
            pool = mapToken_Pool[WBNB];   // Handle BNB
        } else {
            pool = mapToken_Pool[token];  // Handle normal token
        } 
        return pool;
    }
    function tokenCount() public view returns(uint256){
        return arrayTokens.length;
    }
    function getToken(uint256 i) public view returns(address){
        return arrayTokens[i];
    }
    function getCuratedPool(uint256 i) public view returns(address){
        return curatedPools[i];
    }
    function getTradeLength() public view returns(uint256){
        return feeArray.length;
    }
    function getCuratedPoolsLength() public view returns(uint256){
        return curatedPools.length;
    }
   


}