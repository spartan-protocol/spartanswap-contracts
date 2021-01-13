// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./IContracts.sol";


contract Pool is iBEP20 {
    using SafeMath for uint256;

    address public BASE;
    address public TOKEN;

    uint256 public one = 10**18;

    // ERC-20 Parameters
    string _name; string _symbol;
    uint256 public override decimals; uint256 public override totalSupply;
    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    uint public genesis;
    uint public baseAmount;
    uint public tokenAmount;
    uint public baseAmountPooled;
    uint public tokenAmountPooled;
    uint public fees;
    uint public volume;
    uint public txCount;

    event AddLiquidity(address member, uint inputBase, uint inputToken, uint unitsIssued);
    event RemoveLiquidity(address member, uint outputBase, uint outputToken, uint unitsClaimed);
    event Swapped(address tokenFrom, address tokenTo, uint inputAmount, uint outputAmount, uint fee, address recipient);

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    constructor (address _base, address _token) public payable {
        BASE = _base;
        TOKEN = _token;

        string memory poolName = "SpartanPoolV1-";
        string memory poolSymbol = "SPT1-";
        _name = string(abi.encodePacked(poolName, iBEP20(_token).name()));
        _symbol = string(abi.encodePacked(poolSymbol, iBEP20(_token).symbol()));
        
        decimals = 18;
        genesis = now;
    }

    //========================================iBEP20=========================================//
    function name() public view override returns (string memory) {
        return _name;
    }
    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
    // iBEP20 Transfer function
    function transfer(address to, uint256 value) public override returns (bool success) {
        _transfer(msg.sender, to, value);
        return true;
    }
    // iBEP20 Approve function
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    // iBEP20 TransferFrom function
    function transferFrom(address from, address to, uint256 value) public override returns (bool success) {
        require(value <= _allowances[from][msg.sender], 'AllowanceErr');
        _allowances[from][msg.sender] = _allowances[from][msg.sender].sub(value);
        _transfer(from, to, value);
        return true;
    }

    // Internal transfer function
    function _transfer(address _from, address _to, uint256 _value) private {
        require(_balances[_from] >= _value, 'BalanceErr');
        require(_balances[_to] + _value >= _balances[_to], 'BalanceErr');
        _balances[_from] -= _value;
        _balances[_to] += _value;
        emit Transfer(_from, _to, _value);
    }

    // Contract can mint
    function _mint(address account, uint256 amount) internal {
        totalSupply = totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }
    // Burn supply
    function burn(uint256 amount) public virtual {
        _burn(msg.sender, amount);
    }
    function burnFrom(address from, uint256 value) public virtual override {
        require(value <= _allowances[from][msg.sender], 'AllowanceErr');
        _allowances[from][msg.sender] -= value;
        _burn(from, value);
    }
    function _burn(address account, uint256 amount) internal virtual {
        _balances[account] = _balances[account].sub(amount, "BalanceErr");
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }


    //==================================================================================//
    // Asset Movement Functions

    // TransferTo function
    function transferTo(address recipient, uint256 amount) public returns (bool) {
                _transfer(tx.origin, recipient, amount);
        return true;
    }

    // Sync internal balances to actual
    function sync() public {
        baseAmount = iBEP20(BASE).balanceOf(address(this));
        tokenAmount = iBEP20(TOKEN).balanceOf(address(this));
    }

    // Add liquidity for self
    function addLiquidity() public returns(uint liquidityUnits){
        liquidityUnits = addLiquidityForMember(msg.sender);
        return liquidityUnits;
    }

    // Add liquidity for a member
    function addLiquidityForMember(address member) public returns(uint liquidityUnits){
        uint256 _actualInputBase = _getAddedBaseAmount();
        uint256 _actualInputToken = _getAddedTokenAmount();
        liquidityUnits = _DAO().UTILS().calcLiquidityUnits(_actualInputBase, baseAmount, _actualInputToken, tokenAmount, totalSupply);
        _incrementPoolBalances(_actualInputBase, _actualInputToken);
        _mint(member, liquidityUnits);
        emit AddLiquidity(member, _actualInputBase, _actualInputToken, liquidityUnits);
        return liquidityUnits;
    }

    // Remove Liquidity
    function removeLiquidity() public returns (uint outputBase, uint outputToken) {
        return removeLiquidityForMember(msg.sender);
    } 

    // Remove Liquidity for a member
    function removeLiquidityForMember(address member) public returns (uint outputBase, uint outputToken) {
        uint units = balanceOf(member);
        outputBase = _DAO().UTILS().calcLiquidityShare(units, BASE, address(this), member);
        outputToken = _DAO().UTILS().calcLiquidityShare(units, TOKEN, address(this), member);
        _decrementPoolBalances(outputBase, outputToken);
        _burn(address(this), units);
        iBEP20(BASE).transfer(member, outputBase);
        iBEP20(TOKEN).transfer(member, outputToken);
        emit RemoveLiquidity(member, outputBase, outputToken, units);
        return (outputBase, outputToken);
    }

    function swap(address token) public returns (uint outputAmount, uint fee){
        (outputAmount, fee) = swapTo(token, msg.sender);
        return (outputAmount, fee);
    }

    function swapTo(address token, address member) public payable returns (uint outputAmount, uint fee) {
        require((token == BASE || token == TOKEN), "Must be BASE or TOKEN");
        address _fromToken; uint _amount;
        if(token == BASE){
            _fromToken = TOKEN;
            _amount = _getAddedTokenAmount();
            (outputAmount, fee) = _swapTokenToBase(_amount);
        } else {
            _fromToken = BASE;
            _amount = _getAddedBaseAmount();
            (outputAmount, fee) = _swapBaseToToken(_amount);
        }
        emit Swapped(_fromToken, token, _amount, outputAmount, fee, member);
        iBEP20(token).transfer(member, outputAmount);
        return (outputAmount, fee);
    }

    function _getAddedBaseAmount() internal view returns(uint256 _actual){
        uint _baseBalance = iBEP20(BASE).balanceOf(address(this)); 
        if(_baseBalance > baseAmount){
            _actual = _baseBalance.sub(baseAmount);
        } else {
            _actual = 0;
        }
        return _actual;
    }
    function _getAddedTokenAmount() internal view returns(uint256 _actual){
        uint _tokenBalance = iBEP20(TOKEN).balanceOf(address(this)); 
        if(_tokenBalance > tokenAmount){
            _actual = _tokenBalance.sub(tokenAmount);
        } else {
            _actual = 0;
        }
        return _actual;
    }

    function _swapBaseToToken(uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = baseAmount;
        uint256 _Y = tokenAmount;
        _y =  _DAO().UTILS().calcSwapOutput(_x, _X, _Y);
        _fee = _DAO().UTILS().calcSwapFee(_x, _X, _Y);
        _setPoolAmounts(_X.add(_x), _Y.sub(_y));
        _addPoolMetrics(_y+_fee, _fee, false);
        return (_y, _fee);
    }

    function _swapTokenToBase(uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = tokenAmount;
        uint256 _Y = baseAmount;
        _y =  _DAO().UTILS().calcSwapOutput(_x, _X, _Y);
        _fee = _DAO().UTILS().calcSwapFee(_x, _X, _Y);
        _setPoolAmounts(_Y.sub(_y), _X.add(_x));
        _addPoolMetrics(_y+_fee, _fee, true);
        return (_y, _fee);
    }

    //==================================================================================//
    // Data Model


    // Increment internal balances
    function _incrementPoolBalances(uint _baseAmount, uint _tokenAmount) internal  {
        baseAmount += _baseAmount;
        tokenAmount += _tokenAmount;
        baseAmountPooled += _baseAmount;
        tokenAmountPooled += _tokenAmount; 
    }
    function _setPoolAmounts(uint256 _baseAmount, uint256 _tokenAmount) internal  {
        baseAmount = _baseAmount;
        tokenAmount = _tokenAmount; 
    }

    // Decrement internal balances
    function _decrementPoolBalances(uint _baseAmount, uint _tokenAmount) internal  {
        uint _removedBase = _DAO().UTILS().calcShare(_baseAmount, baseAmount, baseAmountPooled);
        uint _removedToken = _DAO().UTILS().calcShare(_tokenAmount, tokenAmount, tokenAmountPooled);
        baseAmountPooled = baseAmountPooled.sub(_removedBase);
        tokenAmountPooled = tokenAmountPooled.sub(_removedToken); 
        baseAmount = baseAmount.sub(_baseAmount);
        tokenAmount = tokenAmount.sub(_tokenAmount); 
    }

    function _addPoolMetrics(uint256 _volume, uint256 _fee, bool _toBase) internal {
        if(_toBase){
            volume += _volume;
            fees += _fee;
        } else {
            volume += _DAO().UTILS().calcValueInBaseWithPool(address(this), _volume);
            fees += _DAO().UTILS().calcValueInBaseWithPool(address(this), _fee);
        }
        txCount += 1;
    }
}

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
        address pool = Router(oldRouter).getPool(0xdD1755e883a39C0D4643733E02003044a3B2D7A7);
        uint recFees = Pool(pool).fees();
        uint tFees = Router(oldRouter).totalFees();
        totalFees = tFees.sub(recFees);//remove recovery pool fees 
        removeLiquidityTx = Router(oldRouter).removeLiquidityTx();
        addLiquidityTx = Router(oldRouter).addLiquidityTx();
        swapTx = Router(oldRouter).swapTx();
    }

    function migrateDepthData(address payable oldRouter) public onlyDAO {
          uint256 tokenCount = Router(oldRouter).tokenCount();
          uint sum = 0;
        for(uint256 i = 0; i<tokenCount; i++){
            address token = Router(oldRouter).getToken(i);
            address pool = Router(oldRouter).getPool(token);
            if(!(token == 0xdD1755e883a39C0D4643733E02003044a3B2D7A7)){
            sum = sum.add(Pool(pool).baseAmount());
             } 
        } totalPooled = sum;
    }


    function migrateTokenData(address payable oldRouter) public onlyDAO {
        uint256 tokenCount = Router(oldRouter).tokenCount();
        for(uint256 i = 0; i<tokenCount; i++){
            address token = Router(oldRouter).getToken(i);
            address pool = Router(oldRouter).getPool(token);
        if(!(token == 0xdD1755e883a39C0D4643733E02003044a3B2D7A7)){//removes RECOVERY token from listed pools array
            isPool[pool] = true;
            arrayTokens.push(token);
            mapToken_Pool[token] = pool;
        } 
        }
    }

    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }

    function createPool(uint256 inputBase, uint256 inputToken, address token) public payable onlyDAO returns(address pool){
        require(getPool(token) == address(0), "CreateErr");
        require(token != BASE, "Must not be Base");
        require((inputToken > 0 && inputBase > 0), "Must get tokens for both");
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
        _handleTransferIn(token, inputToken, pool);
        totalPooled += _actualInputBase;
        addLiquidityTx += 1;
        units = Pool(pool).addLiquidityForMember(member);
        emit AddLiquidity(member,inputBase,inputToken,units);
        return units;
    }

    // Remove % for self
    function removeLiquidity(uint basisPoints, address token) public returns (uint outputBase, uint outputToken) {
        require((basisPoints > 0 && basisPoints <= 10000), "InputErr");
        uint _units = _DAO().UTILS().calcPart(basisPoints, iBEP20(getPool(token)).balanceOf(msg.sender));
        return removeLiquidityExact(_units, token);
    }

    // Remove an exact qty of units
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

       // Remove % Asymmetrically
    function removeLiquidityAndSwap(uint basisPoints, bool toBase, address token) public returns (uint outputAmount){
        uint _units = _DAO().UTILS().calcPart(basisPoints, iBEP20(getPool(token)).balanceOf(msg.sender));
        outputAmount = removeLiquidityExactAndSwap(_units, toBase, token);
        return outputAmount;
    }
    // Remove Exact Asymmetrically
    function removeLiquidityExactAndSwap(uint units, bool toBase, address token) public returns (uint outputAmount){
        address _pool = getPool(token);
        require(units < iBEP20(_pool).totalSupply(), "InputErr");
        Pool(_pool).transferTo(_pool, units);
        (uint _outputBase, uint _outputToken) = Pool(_pool).removeLiquidity();
        totalPooled = totalPooled.sub(_outputBase);
        removeLiquidityTx += 1;
        if(toBase){
            // sell to BASE
            iBEP20(token).transfer(_pool, _outputToken);
            (uint _baseBought, uint _fee) = Pool(_pool).swap(token); //this is not counted in totalPooled calcs
            totalFees += _fee;
            outputAmount = _baseBought.add(_outputBase);
            _handleTransferOut(BASE, outputAmount, msg.sender);
        } else {
            // buy to TOKEN
            iBEP20(BASE).transfer(_pool, _outputToken);
            (uint _tokenBought, uint _fee) = Pool(_pool).swap(BASE); //this is not counted in totalPooled calcs
            totalFees += _DAO().UTILS().calcValueInBase(token, _fee);
            outputAmount = _tokenBought.add(_outputToken);
            _handleTransferOut(token, outputAmount, msg.sender);
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
        totalFees += _DAO().UTILS().calcValueInBase(token, fee);
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
            addTradeFee(fee);//add fee to feeArray
            addDividend(toToken, fee); //add dividend
           }
        } else if(toToken == BASE) {
            (outputAmount, fee) = sellTo(inputAmount, fromToken, member);
            address _pool = getPool(toToken);
            if(isCuratedPool[_pool]){
            addTradeFee(fee);//add fee to feeArray
            addDividend(toToken, fee); //add dividend
           }
        } else {
            address _poolTo = getPool(toToken);
            (uint256 _yy, uint256 _feey) = sellTo(inputAmount, fromToken, _poolTo);
            totalVolume += _yy; totalFees += _feey;
            address _toToken = toToken;
             if(isCuratedPool[_poolTo]){
            addTradeFee(fee);//add fee to feeArray
            addDividend(toToken, fee); //add dividend
           }
            if(toToken == address(0)){_toToken = WBNB;} // Handle BNB
            (uint _zz, uint _feez) = Pool(_poolTo).swap(_toToken);
             if(isCuratedPool[_poolTo]){
            addTradeFee(fee);//add fee to feeArray
            addDividend(toToken, fee); //add dividend
           }
            _handleTransferOut(toToken, _zz, member);
            totalFees += _DAO().UTILS().calcValueInBase(toToken, _feez);
            _transferAmount = _yy; outputAmount = _zz; 
            fee = _feez + _DAO().UTILS().calcValueInToken(toToken, _feey);
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

    function addDividend(address _token, uint256 _fees) internal returns (bool){
        if(!(normalAverageFee == 0)){
             uint reserve = iBEP20(BASE).balanceOf(address(this)); // get base balance
            if(!(reserve == 0)){
            address _pool = getPool(_token);
            uint dailyAllocation = reserve.div(eraLength).div(maxTrades); // get max dividend for reserve/30/100 
            uint numerator = _fees.mul(dailyAllocation);
            uint feeDividend = numerator.div(_fees.add(normalAverageFee));
            totalFees = totalFees.add(feeDividend);
            iBEP20(BASE).transfer(_pool,feeDividend);    //This not added to total pooled
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
        require(token != BASE, 'not base');
        address _pool = getPool(token);
        require(isPool[_pool] == true, 'not a pool :/');
        isCuratedPool[_pool] = true;
        curatedPools.push(_pool);
        return true;
    }
    function removeCuratedPool(address token) public onlyDAO returns (bool){
        require(token != BASE, 'not base');
        address _pool = getPool(token);
        require(isCuratedPool[_pool] == true, 'no need remove');
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
    function getTradeLength() public view returns(uint256){
        return feeArray.length;
    }

}