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
interface iWBNB {
    function withdraw(uint256) external;
}
interface iBASE {
    function secondsPerEra() external view returns (uint256);
    function DAO() external view returns (iDAO);
}
interface iUTILS {
    function calcPart(uint bp, uint total) external pure returns (uint part);
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
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
        __transfer(msg.sender, to, value);
        return true;
    }
    // iBEP20 Approve function
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        __approve(msg.sender, spender, amount);
        return true;
    }
    function __approve(address owner, address spender, uint256 amount) internal virtual {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    // iBEP20 TransferFrom function
    function transferFrom(address from, address to, uint256 value) public override returns (bool success) {
        require(value <= _allowances[from][msg.sender], 'AllowanceErr');
        _allowances[from][msg.sender] = _allowances[from][msg.sender].sub(value);
        __transfer(from, to, value);
        return true;
    }

    // Internal transfer function
    function __transfer(address _from, address _to, uint256 _value) private {
        require(_balances[_from] >= _value, 'BalanceErr');
        require(_balances[_to] + _value >= _balances[_to], 'BalanceErr');
        _balances[_from] =_balances[_from].sub(_value);
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
        __burn(msg.sender, amount);
    }
    function burnFrom(address from, uint256 value) public virtual override {
        require(value <= _allowances[from][msg.sender], 'AllowanceErr');
        _allowances[from][msg.sender] = _allowances[from][msg.sender].sub(value);
        __burn(from, value);
    }
    function __burn(address account, uint256 amount) internal virtual {
        _balances[account] = _balances[account].sub(amount, "BalanceErr");
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }


    //==================================================================================//
    // Extended Asset Functions

    // TransferTo function
    function transferTo(address recipient, uint256 amount) public returns (bool) {
        __transfer(tx.origin, recipient, amount);
        return true;
    }

    function sync() public {
        baseAmount = iBEP20(BASE).balanceOf(address(this));
        tokenAmount = iBEP20(TOKEN).balanceOf(address(this));
    }

    function addLiquidity() public returns(uint liquidityUnits){
        liquidityUnits = addLiquidityForMember(msg.sender);
        return liquidityUnits;
    }

    function addLiquidityForMember(address member) public returns(uint liquidityUnits){
        uint256 _actualInputBase = _getAddedBaseAmount();
        uint256 _actualInputToken = _getAddedTokenAmount();
        liquidityUnits = _DAO().UTILS().calcLiquidityUnits(_actualInputBase, baseAmount, _actualInputToken, tokenAmount, totalSupply);
        _incrementPoolBalances(_actualInputBase, _actualInputToken);
        _mint(member, liquidityUnits);
        emit AddLiquidity(member, _actualInputBase, _actualInputToken, liquidityUnits);
        return liquidityUnits;
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

    // Remove Liquidity
    function removeLiquidity() public returns (uint outputBase, uint outputToken) {
        return removeLiquidityForMember(msg.sender);
    } 

    // Remove Liquidity
    function removeLiquidityForMember(address member) public returns (uint outputBase, uint outputToken) {
        uint units = balanceOf(address(this));
        uint _baseAmount; uint _tokenAmount;
        _baseAmount = iBEP20(BASE).balanceOf(address(this));
        _tokenAmount = iBEP20(TOKEN).balanceOf(address(this));
        outputBase = _DAO().UTILS().calcShare(units, totalSupply, _baseAmount);
        outputToken = _DAO().UTILS().calcShare(units, totalSupply, _tokenAmount);
        _decrementPoolBalances(outputBase, outputToken);
        __burn(address(this), units);
        iBEP20(BASE).transfer(member, outputBase);
        iBEP20(TOKEN).transfer(member, outputToken);
        emit RemoveLiquidity(member, outputBase, outputToken, units);
        return (outputBase, outputToken);
    }

    //==================================================================================//
    // Data Model

    // Set internal balances
    function _setPoolBalances(uint _baseAmount, uint _tokenAmount, uint _baseAmountPooled, uint _tokenAmountPooled) internal {
        baseAmountPooled = _baseAmountPooled;
        tokenAmountPooled = _tokenAmountPooled; 
        __setPool(_baseAmount, _tokenAmount);
    }

    // Increment internal balances
    function _incrementPoolBalances(uint _baseAmount, uint _tokenAmount) internal  {
        baseAmount += _baseAmount;
        tokenAmount += _tokenAmount;
        baseAmountPooled += _baseAmount;
        tokenAmountPooled += _tokenAmount; 
    }
    function _setPoolAmounts(uint256 _baseAmount, uint256 _tokenAmount) internal  {
        __setPool(_baseAmount, _tokenAmount); 
    }
    function __setPool(uint256 _baseAmount, uint256 _tokenAmount) internal  {
        baseAmount = _baseAmount;
        tokenAmount = _tokenAmount; 
    }

    // Decrement internal balances
    function _decrementPoolBalances(uint _baseAmount, uint _tokenAmount) internal  {
        uint _removedBase = _DAO().UTILS().calcShare(_baseAmount, baseAmount, baseAmountPooled);
        uint _removedToken = _DAO().UTILS().calcShare(_tokenAmount, tokenAmount, tokenAmountPooled);
        baseAmountPooled = baseAmountPooled.sub(_removedBase);
        tokenAmountPooled = tokenAmountPooled.sub(_removedToken); 
        __decrementPool(_baseAmount, _tokenAmount); 
    }
    function __decrementPool(uint _baseAmount, uint _tokenAmount) internal  {
        baseAmount = baseAmount.sub(_baseAmount);
        tokenAmount = tokenAmount.sub(_tokenAmount); 
    }

    function _addPoolMetrics(uint256 _volume, uint256 _fee) internal {
        txCount += 1;
        volume += _volume;
        fees += _fee;
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
    uint public removeTx;
    uint public addTx;
    uint public swapTx;

    address[] public arrayTokens;
    mapping(address=>address) private mapToken_Pool;
    mapping(address=>bool) public isPool;

    event NewPool(address token, address pool, uint genesis);
    event AddLiquidity(address member, uint inputBase, uint inputToken, uint unitsIssued);
    event RemoveLiquidity(address member, uint outputBase, uint outputToken, uint unitsClaimed);
    event Swapped(address tokenFrom, address tokenTo, uint inputAmount, uint transferAmount, uint outputAmount, uint fee, address recipient);

    // Only Deployer can execute
    modifier onlyDeployer() {
        require(msg.sender == DEPLOYER, "DeployerErr");
        _;
    }

    constructor (address _base, address _wbnb) public payable {
        BASE = _base;
        WBNB = _wbnb;
        DEPLOYER = msg.sender;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    receive() external payable {
        buyTo(msg.value, address(0), msg.sender);
    }

    // In case of new router can migrate metrics
    function migrateRouterData(address payable oldRouter) public onlyDeployer {
        totalPooled = Router(oldRouter).totalPooled();
        totalVolume = Router(oldRouter).totalVolume();
        totalFees = Router(oldRouter).totalFees();
        removeTx = Router(oldRouter).removeTx();
        addTx = Router(oldRouter).addTx();
        swapTx = Router(oldRouter).swapTx();
    }

    function migrateTokenData(address payable oldRouter) public onlyDeployer {
        uint256 tokenCount = Router(oldRouter).tokenCount();
        for(uint256 i = 0; i<tokenCount; i++){
            address token = Router(oldRouter).getToken(i);
            address pool = Router(oldRouter).getPool(token);
            isPool[pool] = true;
            arrayTokens.push(token);
            mapToken_Pool[token] = pool;
        }
    }

    function purgeDeployer() public onlyDeployer {
        DEPLOYER = address(0);
    }

    function createPool(uint256 inputBase, uint256 inputToken, address token) public returns(address pool){
        require(getPool(token) == address(0), "CreateErr");
        require(token != BASE && token != address(0), "Must not be Base or BNB");
        require((inputToken > 0 && inputBase > 0), "Must get tokens for both");
        Pool newPool; address _token = token;
        // if(token == address(0)){_token = WBNB;} // Handle BNB
        newPool = new Pool(BASE, _token); 
        pool = address(newPool);
        mapToken_Pool[_token] = pool;
        uint256 _actualInputBase = _handleTransferIn(BASE, inputBase, pool);
        _handleTransferIn(token, inputToken, pool);
        arrayTokens.push(_token);
        isPool[pool] = true;
        totalPooled += _actualInputBase;
        addTx += 1;
        Pool(pool).addLiquidityForMember(msg.sender);
        emit NewPool(token, pool, now);
        return pool;
    }

    function addLiquidity(uint inputBase, uint inputToken, address token) public returns (uint units) {
        units = addLiquidityForMember(inputBase, inputToken, token, msg.sender);
        return units;
    }

    function addLiquidityForMember(uint inputBase, uint inputToken, address token, address member) public returns (uint units) {
        address pool = getPool(token);
        uint256 _actualInputBase = _handleTransferIn(BASE, inputBase, pool);
        _handleTransferIn(token, inputToken, pool);
        totalPooled += _actualInputBase;
        addTx += 1;
        units = Pool(pool).addLiquidityForMember(member);
        return units;
    }

    //==================================================================================//
    // Unstaking functions

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
        (outputBase, outputToken) = Pool(_pool).removeLiquidityForMember(_member);
        totalPooled = totalPooled.sub(outputBase);
        removeTx += 1;
        return (outputBase, outputToken);
    }

    // // Remove % Asymmetrically
    function removeLiquidityAsymmetric(uint basisPoints, bool toBase, address token) public returns (uint outputAmount){
        uint _units = _DAO().UTILS().calcPart(basisPoints, iBEP20(getPool(token)).balanceOf(msg.sender));
        outputAmount = removeLiquidityExactAsymmetric(_units, toBase, token);
        return outputAmount;
    }
    // Remove Exact Asymmetrically
    function removeLiquidityExactAsymmetric(uint units, bool toBase, address token) public returns (uint outputAmount){
        address _pool = getPool(token);
        require(units < iBEP20(_pool).totalSupply(), "InputErr");
        Pool(_pool).transferTo(_pool, units);
        (uint _outputBase, uint _outputToken) = Pool(_pool).removeLiquidity();
        totalPooled = totalPooled.sub(_outputBase);
        removeTx += 1;
        if(toBase){
            // sell to BASE
            (uint _baseBought, uint _fee) = sellTo(_outputToken, token, msg.sender);
            outputAmount = _baseBought.add(_outputBase);
            _handleTransferOut(BASE, _outputBase, msg.sender);
        } else {
            // buy to TOKEN
            (uint _tokenBought, uint _fee) = buyTo(_outputBase, token, msg.sender);
            outputAmount = _tokenBought.add(_outputToken);
            _handleTransferOut(token, _outputToken, msg.sender);
        }
        return outputAmount;
    }

    //==================================================================================//
    // Swapping Functions

    function buy(uint256 amount, address token) public returns (uint256 outputAmount, uint256 fee){
        (outputAmount, fee) = buyTo(amount, token, msg.sender);
        return (outputAmount, fee);
    }
    function buyTo(uint amount, address token, address payable member) public payable returns (uint outputAmount, uint fee) {
        address _pool = getPool(token);
        // Pool(_pool)._checkApprovals();
        uint _actualAmount = _handleTransferIn(BASE, amount, _pool);
        (outputAmount, fee) = _swapBaseToToken(_pool, _actualAmount);
        totalPooled += _actualAmount;
        totalVolume += _actualAmount;
        totalFees += _DAO().UTILS().calcValueInBase(token, fee);
        swapTx += 1;
        _handleTransferOut(token, outputAmount, member);
        emit Swapped(BASE, token, _actualAmount, 0, outputAmount, fee, member);
        return (outputAmount, fee);
    }

    function sell(uint amount, address token) public payable returns (uint outputAmount, uint fee){
        (outputAmount, fee) = sellTo(amount, token, msg.sender);
        return (outputAmount, fee);
    }
    function sellTo(uint amount, address token, address payable member) public payable returns (uint outputAmount, uint fee) {
        address _pool = getPool(token);
        // Pool(_pool)._checkApprovals();
        uint _actualAmount = _handleTransferIn(token, amount, _pool);
        (outputAmount, fee) = _swapTokenToBase(_pool, _actualAmount);
        totalPooled = totalPooled.sub(outputAmount);
        totalVolume += outputAmount;
        totalFees += fee;
        swapTx += 1;
        _handleTransferOut(BASE, outputAmount, member);
        emit Swapped(token, BASE, _actualAmount, 0, outputAmount, fee, member);
        return (outputAmount, fee);
    }

    function swap(uint256 inputAmount, address fromToken, address toToken) public payable returns (uint256 outputAmount, uint256 fee) {
        require(fromToken != toToken, "InputErr");
        address _poolFrom = getPool(fromToken); address _poolTo = getPool(toToken);
        // Pool(_poolFrom)._checkApprovals();
        // Pool(_poolTo)._checkApprovals();
        uint256 _actualAmount = _handleTransferIn(fromToken, inputAmount, _poolFrom);
        uint256 _transferAmount = 0;
        swapTx += 1;
        if(fromToken == BASE){
            (outputAmount, fee) = _swapBaseToToken(_poolFrom, _actualAmount);      // Buy to token
            totalPooled += _actualAmount;
            totalVolume += _actualAmount;
        } else if(toToken == BASE) {
            (outputAmount, fee) = _swapTokenToBase(_poolFrom,_actualAmount);   // Sell to token
            totalPooled = totalPooled.sub(outputAmount);
            totalVolume += outputAmount;
        } else {
            (uint256 _yy, uint256 _feey) = _swapTokenToBase(_poolFrom, _actualAmount);    // Sell to BASE
            totalVolume += _yy; totalFees += _feey;
            iBEP20(BASE).transferFrom(_poolFrom, _poolTo, _yy); 
            (uint _zz, uint _feez) = _swapBaseToToken(_poolTo, _yy);              // Buy to token
            totalFees += _DAO().UTILS().calcValueInBase(toToken, _feez);
            _transferAmount = _yy; outputAmount = _zz; 
            fee = _feez + _DAO().UTILS().calcValueInToken(toToken, _feey);
        }
        _handleTransferOut(toToken, outputAmount, msg.sender);
        emit Swapped(fromToken, toToken, _actualAmount, _transferAmount, outputAmount, fee, msg.sender);
        return (outputAmount, fee);
    }

    //==================================================================================//
    // Core swap logic

    function _swapBaseToToken(address pool, uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = Pool(pool).baseAmount();
        uint256 _Y = Pool(pool).tokenAmount();
        _y =  _DAO().UTILS().calcSwapOutput(_x, _X, _Y);
        _fee = _DAO().UTILS().calcSwapFee(_x, _X, _Y);
        // Pool(pool)._setPoolAmounts(_X.add(_x), _Y.sub(_y));
        _updatePoolMetrics(pool, _y+_fee, _fee, false);
        return (_y, _fee);
    }

    function _swapTokenToBase(address pool, uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = Pool(pool).tokenAmount();
        uint256 _Y = Pool(pool).baseAmount();
        _y =  _DAO().UTILS().calcSwapOutput(_x, _X, _Y);
        _fee = _DAO().UTILS().calcSwapFee(_x, _X, _Y);
        // Pool(pool)._setPoolAmounts(_Y.sub(_y), _X.add(_x));
        _updatePoolMetrics(pool, _y+_fee, _fee, true);
        return (_y, _fee);
    }

    // Update pool metrics
    function _updatePoolMetrics(address pool, uint256 _txSize, uint256 _fee, bool _toBase) internal {
        if(_toBase){
            // Pool(pool)._addPoolMetrics(_txSize, _fee);
        } else {
            uint256 _txBase = _DAO().UTILS().calcValueInBaseWithPool(pool, _txSize);
            uint256 _feeBase = _DAO().UTILS().calcValueInBaseWithPool(pool, _fee);
            // Pool(pool)._addPoolMetrics(_txBase, _feeBase);
        }
    }

    //==================================================================================//
    // Token Transfer Functions

    function _handleTransferIn(address _token, uint256 _amount, address _pool) internal returns(uint256 actual){
        if(_amount > 0) {
            if(_token == address(0)){
                // If BNB, then send to WBNB contract, then forward WBNB to pool
                // require((_amount == msg.value), "InputErr");
                // payable(WBNB).call{value:_amount}(""); 
                // iBEP20(WBNB).transfer(address(this), _amount); 
                // actual = _amount;
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
                // iBEP20(WBNB).transferFrom(address(this), address(this), _amount);
                // iWBNB(WBNB).withdraw(_amount);
                // payable(_recipient).call{value:_amount}(""); 
            } else {
                iBEP20(_token).transferFrom(address(this), _recipient, _amount);
            }
        }
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

}