// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./IContracts.sol";
import "./poolFactory.sol";

contract Router {
    using SafeMath for uint256;
    address public BASE;
    address public WBNB;
    address public DEPLOYER;
    uint public totalPooled; 
    uint public totalVolume;
    uint public totalFees;
    uint public removeLiquidityTx;
    uint public addLiquidityTx;
    uint public swapTx;
    uint public maxTrades;
    uint public eraLength;
    uint public normalAverageFee;
    uint public arrayFeeSize;
    uint256 [] public feeArray;
    address[] public arrayTokens;
    address[] public curatedPools;
    mapping(address=>address) private mapToken_Pool;
    mapping(address=>bool) public isPool;
    mapping(address=>bool) public isCuratedPool;
    event NewPool(address token, address pool, uint genesis);
    event AddLiquidity(address member, uint inputBase, uint inputToken, uint unitsIssued);
    event RemoveLiquidity(address member, uint outputBase, uint outputToken, uint unitsClaimed);
    event Swapped(address tokenFrom, address tokenTo, uint inputAmount, uint transferAmount, uint outputAmount, uint fee, address recipient);
    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _;
    }
    constructor (address _base, address _wbnb) public payable {
        BASE = _base;
        WBNB = _wbnb;
        arrayFeeSize = 20;
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
        totalFees = Router(oldRouter).totalFees();
        removeLiquidityTx = Router(oldRouter).removeLiquidityTx();
        addLiquidityTx = Router(oldRouter).addLiquidityTx();
        swapTx = Router(oldRouter).swapTx();
    }
    function migrateTokenData(address payable oldRouter) public onlyDAO {
        uint256 tokenCount = Router(oldRouter).tokenCount();
        for(uint256 i = 0; i<tokenCount; i++){
            address token = Router(oldRouter).getToken(i);
            address pool = Router(oldRouter).getPool(token);
            isPool[pool] = true;
            arrayTokens.push(token);
            mapToken_Pool[token] = pool;
        }
    }
    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }
    function createPool(uint256 inputBase, uint256 inputToken, address token) public payable onlyDAO returns(address pool){
        require(getPool(token) == address(0), "CreateErr");
        require(token != BASE, "MustBase");
        require((inputToken > 0 && inputBase > 0), "Mus");
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
        addLiquidityTx += 1;
        Pool(pool).addLiquidityForMember(msg.sender);
        emit NewPool(token, pool, now);
        return pool;
    }
    function addLiquidity(uint inputBase, uint inputToken, address token) public payable returns (uint units) {
        units = addLiquidityForMember(inputBase, inputToken, token, msg.sender);
        return units;
    }
    function addLiquidityForMember(uint inputBase, uint inputToken, address token, address member) public payable returns (uint units) {
        address pool = getPool(token);
        uint256 _actualInputBase = _handleTransferIn(BASE, inputBase, pool);
        _handleTransferIn(token, inputToken, pool);
        totalPooled += _actualInputBase;
        addLiquidityTx += 1;
        units = Pool(pool).addLiquidityForMember(member);
        emit AddLiquidity(member,inputBase,inputToken,units);
        return units;
    }
    function removeLiquidity(uint basisPoints, address token) public returns (uint outputBase, uint outputToken) {
        require((basisPoints > 0 && basisPoints <= 10000), "InputErr");
        uint _units = iUTILS(_DAO().UTILS()).calcPart(basisPoints, iBEP20(getPool(token)).balanceOf(msg.sender));
        return removeLiquidityExact(_units, token);
    }
    function removeLiquidityExact(uint units, address token) public returns (uint outputBase, uint outputToken) {
        address _pool = getPool(token);
        address _member = msg.sender;
        Pool(_pool).transferTo(_pool, units);
        (outputBase, outputToken) = Pool(_pool).removeLiquidity();
        _handleTransferOut(token, outputToken, _member);
        _handleTransferOut(BASE, outputBase, _member);
        totalPooled = totalPooled.sub(outputBase);
        removeLiquidityTx += 1;
        emit RemoveLiquidity(_member, outputBase, outputToken, units);
        return (outputBase, outputToken);
    }
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
        swapTx += 1;
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
        swapTx += 1;
        return (outputAmount, fee);
    }

    function swap(uint256 inputAmount, address fromToken, address toToken) public payable returns (uint256 outputAmount, uint256 fee) {
        return swapTo(inputAmount, fromToken, toToken, msg.sender);
    }

    function swapTo(uint256 inputAmount, address fromToken, address toToken, address member) public payable returns (uint256 outputAmount, uint256 fee) {
        require(fromToken != toToken, "TokenTypeErr");
        uint256 _transferAmount = 0;
        if(fromToken == BASE){
            (outputAmount, fee) = buyTo(inputAmount, toToken, member);
            address _pool = getPool(toToken);
            if(isCuratedPool[_pool]){
            addTradeFee(fee);
            addDividend(toToken, fee); 
           }
        } else if(toToken == BASE) {
            (outputAmount, fee) = sellTo(inputAmount, fromToken, member);
            address _pool = getPool(fromToken);
            if(isCuratedPool[_pool]){
            addTradeFee(fee);
            addDividend(fromToken, fee); 
           }
        } else {
            address _poolTo = getPool(toToken);
            (uint256 _yy, uint256 _feey) = sellTo(inputAmount, fromToken, _poolTo);
            totalVolume += _yy; totalFees += _feey;
            address _toToken = toToken;
            address _pool = getPool(fromToken);
             if(isCuratedPool[_pool]){
            addTradeFee(fee);
            addDividend(fromToken, fee); 
           }
            if(toToken == address(0)){_toToken = WBNB;} 
            (uint _zz, uint _feez) = Pool(_poolTo).swap(_toToken);
             if(isCuratedPool[_poolTo]){
            addTradeFee(fee);
            addDividend(toToken, fee); 
           }
            _handleTransferOut(toToken, _zz, member);
            totalFees += iUTILS(_DAO().UTILS()).calcSpotValueInBase(toToken, _feez);
            _transferAmount = _yy; outputAmount = _zz; 
            fee = _feez + iUTILS(_DAO().UTILS()).calcSpotValueInToken(toToken, _feey);
        }
        emit Swapped(fromToken, toToken, inputAmount, _transferAmount, outputAmount, fee, member);
        return (outputAmount, fee);
    }
    function _handleTransferIn(address _token, uint256 _amount, address _pool) internal returns(uint256 actual){
        if(_amount > 0) {
            if(_token == address(0)){
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
                iWBNB(WBNB).withdraw(_amount);
                payable(_recipient).call{value:_amount}(""); 
            } else {
                iBEP20(_token).transfer(_recipient, _amount);
            }
        }
    }
    function addDividend(address _token, uint256 _fees) internal returns (bool){
        if(!(normalAverageFee == 0)){
             uint reserve = iBEP20(BASE).balanceOf(address(this));
            if(!(reserve == 0)){
            address _pool = getPool(_token);
            uint dailyAllocation = reserve.div(eraLength).div(maxTrades); 
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
            totalTradeFees = totalTradeFees.add(feeArray[i]);}
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
    function changeArrayFeeSize(uint _size) public onlyDAO returns(bool){
        arrayFeeSize = _size;
        return true;
    }
    function changeMaxTrades(uint _maxtrades) public onlyDAO returns(bool){
        maxTrades = _maxtrades;
        return true;
    }
     function changeEraLength(uint _eraLength) public onlyDAO returns(bool){
        eraLength = _eraLength;
        return true;
    }
    function forwardRouterFunds(address newRouterAddress ) public onlyDAO returns(bool){
        uint balanceBase = iBEP20(BASE).balanceOf(address(this)); // get base balance
        iBEP20(BASE).transfer(newRouterAddress, balanceBase);
        return true;
    }

    function addCuratedPool(address token) public onlyDAO returns (bool){
        require(token != BASE, 'notbase');
        address _pool = getPool(token);
        require(isPool[_pool] == true, 'notpool');
        isCuratedPool[_pool] = true;
        curatedPools.push(_pool);
        return true;
    }
    function getPool(address token) public view returns(address pool){
        if(token == address(0)){
            pool = mapToken_Pool[WBNB]; 
        } else {
            pool = mapToken_Pool[token];  
        } 
        return pool;
    }

    function tokenCount() public view returns(uint256){
        return arrayTokens.length;
    }

    function getToken(uint256 i) public view returns(address){
        return arrayTokens[i];
    }
    function getTradeLength() public view returns(uint256){
        return feeArray.length;
    }

}