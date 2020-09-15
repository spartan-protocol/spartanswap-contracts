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
    function calcPart(uint256 bp, uint256 total) external pure returns (uint256 part);
    function calcShare(uint256 part, uint256 total, uint256 amount) external pure returns (uint256 share);
    function calcSwapOutput(uint256 x, uint256 X, uint256 Y) external pure returns (uint256 output);
    function calcSwapFee(uint256 x, uint256 X, uint256 Y) external pure returns (uint256 output);
    function calcStakeUnits(uint256 a, uint256 A, uint256 v, uint256 S) external pure returns (uint256 units);
    // function calcAsymmetricShare(uint256 s, uint256 T, uint256 A) external pure returns (uint256 share);
    // function getPoolAge(address token) external view returns(uint256 age);
    function getPoolShare(address token, uint256 units) external view returns(uint256 baseAmt, uint256 tokenAmt);
    function getPoolShareAssym(address token, uint256 units, bool toBase) external view returns(uint256 baseAmt, uint256 tokenAmt, uint256 outputAmt);
    function calcValueInBase(address token, uint256 amount) external view returns (uint256 value);
    function calcValueInToken(address token, uint256 amount) external view returns (uint256 value);
    function calcValueInBaseWithPool(address pool, uint256 amount) external view returns (uint256 value);
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
    // iUTILS public UTILS;
    address public TOKEN;

    uint256 public one = 10**18;

    // ERC-20 Parameters
    string _name; string _symbol;
    uint256 public override decimals; uint256 public override totalSupply;
    // ERC-20 Mappings
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 public genesis;
    uint256 public baseAmt;
    uint256 public tokenAmt;
    uint256 public baseAmtStaked;
    uint256 public tokenAmtStaked;
    uint256 public fees;
    uint256 public volume;
    uint256 public txCount;
    
    // Only Router can execute
    modifier onlyRouter() {
        _isRouter();
        _;
    }

    function _isRouter() internal view {
        // iDAO dao = _DAO();
        require(msg.sender == _DAO().ROUTER(), "RouterErr");
    }

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

    function _checkApprovals() external onlyRouter{
        if(iBEP20(BASE).allowance(address(this), _DAO().ROUTER()) == 0){
            if(TOKEN != address(0)){
                iBEP20(TOKEN).approve(_DAO().ROUTER(), uint256(-1));
            }
        iBEP20(BASE).approve(_DAO().ROUTER(), uint256(-1));
        }
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

    // Router can mint
    function _mint(address account, uint256 amount) external onlyRouter {
        totalSupply = totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        iDAO dao = iDAO(iBASE(BASE).DAO());
        _allowances[account][dao.ROUTER()] += amount;
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
        if (TOKEN == address(0)) {
            tokenAmt = address(this).balance;
        } else {
            tokenAmt = iBEP20(TOKEN).balanceOf(address(this));
        }
    }

    function add(address token, uint256 amount) public returns (bool success) {
        if(token == BASE){
            iBEP20(BASE).transferFrom(msg.sender, address(this), amount);
            baseAmt = baseAmt.add(amount);
            return true;
        } else if (token == TOKEN){
            iBEP20(TOKEN).transferFrom(msg.sender, address(this), amount);
            tokenAmt = tokenAmt.add(amount); 
            return true;
        } else {
            return false;
        }
    } 

    //==================================================================================//
    // Data Model
    function _incrementPoolBalances(uint256 _baseAmt, uint256 _tokenAmt)  external onlyRouter  {
        baseAmt += _baseAmt;
        tokenAmt += _tokenAmt;
        baseAmtStaked += _baseAmt;
        tokenAmtStaked += _tokenAmt; 
    }
    function _setPoolBalances(uint256 _baseAmt, uint256 _tokenAmt, uint256 _baseAmtStaked, uint256 _tokenAmtStaked)  external onlyRouter  {
        baseAmtStaked = _baseAmtStaked;
        tokenAmtStaked = _tokenAmtStaked; 
        __setPool(_baseAmt, _tokenAmt);
    }
    function _setPoolAmounts(uint256 _baseAmt, uint256 _tokenAmt)  external onlyRouter  {
        __setPool(_baseAmt, _tokenAmt); 
    }
    function __setPool(uint256 _baseAmt, uint256 _tokenAmt) internal  {
        baseAmt = _baseAmt;
        tokenAmt = _tokenAmt; 
    }

    function _decrementPoolBalances(uint256 _baseAmt, uint256 _tokenAmt)  external onlyRouter  {
        uint256 _unstakedBase = _DAO().UTILS().calcShare(_baseAmt, baseAmt, baseAmtStaked);
        uint256 _unstakedToken = _DAO().UTILS().calcShare(_tokenAmt, tokenAmt, tokenAmtStaked);
        baseAmtStaked = baseAmtStaked.sub(_unstakedBase);
        tokenAmtStaked = tokenAmtStaked.sub(_unstakedToken); 
        __decrementPool(_baseAmt, _tokenAmt); 
    }
 
    function __decrementPool(uint256 _baseAmt, uint256 _tokenAmt) internal  {
        baseAmt = baseAmt.sub(_baseAmt);
        tokenAmt = tokenAmt.sub(_tokenAmt); 
    }

    function _addPoolMetrics(uint256 _volume, uint256 _fee) external onlyRouter  {
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

    uint256 public currentEra;
    uint256 public nextEraTime;
    uint256 public reserve;
    uint256 public feeFactor;
    uint256 public swapFee;
    uint256 public feeToBurn;

    uint256 public totalStaked; 
    uint256 public totalVolume;
    uint256 public totalFees;
    uint256 public unstakeTx;
    uint256 public stakeTx;
    uint256 public swapTx;

    address[] public arrayTokens;
    mapping(address=>address) private mapToken_Pool;
    mapping(address=>bool) public isPool;
    mapping(address=>uint256) public mapPool_accruedRewards;
    mapping(address=>bool) public hasPaidRewardsInEra;

    event NewPool(address token, address pool, uint256 genesis);
    event Staked(address member, uint256 inputBase, uint256 inputToken, uint256 unitsIssued);
    event Unstaked(address member, uint256 outputBase, uint256 outputToken, uint256 unitsClaimed);
    event Swapped(address tokenFrom, address tokenTo, uint256 inputAmount, uint256 transferAmount, uint256 outputAmount, uint256 fee, address recipient);
    event NewEra(uint256 currentEra, uint256 nextEraTime, uint256 reserve);

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == address(_DAO()) || msg.sender == DEPLOYER, "Must be DAO");
        _;
    }

    constructor (address _base, address _wbnb) public payable {
        BASE = _base;
        WBNB = _wbnb;
        DEPLOYER = msg.sender;
        feeFactor = 1000;
        swapFee = 10**18;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    receive() external payable {
        buyTo(msg.value, address(0), msg.sender);
    }

    function migrateRouterData(address payable oldRouter) public onlyDAO {
        totalStaked = Router(oldRouter).totalStaked();
        totalVolume = Router(oldRouter).totalVolume();
        totalFees = Router(oldRouter).totalFees();
        unstakeTx = Router(oldRouter).unstakeTx();
        stakeTx = Router(oldRouter).stakeTx();
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

    function setFeeFactors(uint256 _feeFactor, uint256 _swapFee) public onlyDAO {
        feeFactor = _feeFactor;
        swapFee = _swapFee;
    }

    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }

    function createPool(uint256 inputBase, uint256 inputToken, address token) public payable returns(address pool){
        require(getPool(token) == address(0), "CreateErr");
        require(token != BASE, "Must not be Base");
        require((inputToken > 0 && inputBase > 0), "Must get tokens for both");
        Pool newPool; address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        newPool = new Pool(BASE, _token); 
        pool = address(newPool);
        mapToken_Pool[_token] = pool;
        uint256 _actualInputToken = _handleTransferIn(token, inputToken, pool);
        uint256 _actualInputBase = _handleTransferIn(BASE, inputBase, pool);
        arrayTokens.push(_token);
        isPool[pool] = true;
        totalStaked += _actualInputBase;
        stakeTx += 1;
        uint256 units = _handleStake(pool, _actualInputBase, _actualInputToken, msg.sender);
        emit NewPool(token, pool, now);
        emit Staked(msg.sender, _actualInputBase, _actualInputToken, units);
        return pool;
    }

    //==================================================================================//
    // Staking functions

    function stake(uint256 inputBase, uint256 inputToken, address token) public payable returns (uint256 units) {
        units = stakeForMember(inputBase, inputToken, token, msg.sender);
        return units;
    }

    function stakeForMember(uint256 inputBase, uint256 inputToken, address token, address member) public payable returns (uint256 units) {
        address _pool = getPool(token);  
        uint256 _actualInputToken = _handleTransferIn(token, inputToken, _pool);
        uint256 _actualInputBase = _handleTransferIn(BASE, inputBase, _pool);
        totalStaked += _actualInputBase;
        stakeTx += 1;
        units = _handleStake(_pool, _actualInputBase, _actualInputToken, member);
        emit Staked(member, _actualInputBase, _actualInputToken, units);
        return units;
    }

    function _handleStake(address _pool, uint256 _baseAmt, uint256 _tokenAmt, address _member) internal returns (uint256 _units) {
        Pool(_pool)._checkApprovals();
        uint256 _S = Pool(_pool).baseAmt().add(_baseAmt);
        uint256 _A = Pool(_pool).tokenAmt().add(_tokenAmt);
        Pool(_pool)._incrementPoolBalances(_baseAmt, _tokenAmt);                                                  
        _units = _DAO().UTILS().calcStakeUnits(_tokenAmt, _A, _baseAmt, _S);  
        Pool(_pool)._mint(_member, _units);
        _checkRevenue(_pool);
        return _units;
    }

    //==================================================================================//
    // Unstaking functions

    // Unstake % for self
    function unstake(uint256 basisPoints, address token) public returns (bool success) {
        require((basisPoints > 0 && basisPoints <= 10000), "InputErr");
        uint256 _units = _DAO().UTILS().calcPart(basisPoints, iBEP20(getPool(token)).balanceOf(msg.sender));
        unstakeExact(_units, token);
        return true;
    }

    // Unstake an exact qty of units
    function unstakeExact(uint256 units, address token) public returns (bool success) {
        address _pool = getPool(token);  
        address member = msg.sender;
        (uint256 _outputBase, uint256 _outputToken) = _DAO().UTILS().getPoolShare(token, units);
        totalStaked = totalStaked.sub(_outputBase);
        unstakeTx += 1;
        _handleUnstake(_pool, units, _outputBase, _outputToken, member);
        emit Unstaked(member, _outputBase, _outputToken, units);
        _handleTransferOut(token, _outputToken, _pool, member);
        _handleTransferOut(BASE, _outputBase, _pool, member);
        return true;
    }

    // // Unstake % Asymmetrically
    function unstakeAsymmetric(uint256 basisPoints, bool toBase, address token) public returns (uint256 outputAmount){
        uint256 _units = _DAO().UTILS().calcPart(basisPoints, iBEP20(getPool(token)).balanceOf(msg.sender));
        outputAmount = unstakeExactAsymmetric(_units, toBase, token);
        return outputAmount;
    }
    // Unstake Exact Asymmetrically
    function unstakeExactAsymmetric(uint256 units, bool toBase, address token) public returns (uint256 outputAmount){
        address _pool = getPool(token); 
        require(units < iBEP20(_pool).totalSupply(), "InputErr");
        (uint256 _outputBase, uint256 _outputToken, uint256 _outputAmount) = _DAO().UTILS().getPoolShareAssym(token, units, toBase);
        totalStaked = totalStaked.sub(_outputBase);
        unstakeTx += 1;
        _handleUnstake(_pool, units, _outputBase, _outputToken, msg.sender);
        emit Unstaked(msg.sender, _outputBase, _outputToken, units);
        _handleTransferOut(token, _outputToken, _pool, msg.sender);
        _handleTransferOut(BASE, _outputBase, _pool, msg.sender);
        return _outputAmount;
    }

    function _handleUnstake(address pool, uint256 _units, uint256 _outputBase, uint256 _outputToken, address _member) internal returns (bool success) {
        Pool(pool)._checkApprovals();
        Pool(pool)._decrementPoolBalances(_outputBase, _outputToken);
        Pool(pool).burnFrom(_member, _units);
        _checkRevenue(pool);
        return true;
    } 

    //==================================================================================//
    // Swapping Functions

    function buy(uint256 amount, address token) public returns (uint256 outputAmount, uint256 fee){
        (outputAmount, fee) = buyTo(amount, token, msg.sender);
        return (outputAmount, fee);
    }
    function buyTo(uint256 amount, address token, address member) public returns (uint256 outputAmount, uint256 fee) {
        address _pool = getPool(token);
        Pool(_pool)._checkApprovals();
        uint256 _actualAmount = _handleTransferIn(BASE, amount, _pool);
        (outputAmount, fee) = _swapBaseToToken(_pool, _actualAmount);
        totalStaked += _actualAmount;
        totalVolume += _actualAmount;
        totalFees += _DAO().UTILS().calcValueInBase(token, fee);
        swapTx += 1;
        addDividend(_pool, fee);
        _handleTransferOut(token, outputAmount, _pool, member);
        emit Swapped(BASE, token, _actualAmount, 0, outputAmount, fee, member);
        return (outputAmount, fee);
    }

    function sell(uint256 amount, address token) public payable returns (uint256 outputAmount, uint256 fee){
        (outputAmount, fee) = sellTo(amount, token, msg.sender);
        return (outputAmount, fee);
    }
    function sellTo(uint256 amount, address token, address member) public payable returns (uint256 outputAmount, uint256 fee) {
        address _pool = getPool(token);
        Pool(_pool)._checkApprovals();
        uint256 _actualAmount = _handleTransferIn(token, amount, _pool);
        (outputAmount, fee) = _swapTokenToBase(_pool, _actualAmount);
        totalStaked = totalStaked.sub(outputAmount);
        totalVolume += outputAmount;
        totalFees += fee;
        swapTx += 1;
        addDividend(_pool, fee);
        _handleTransferOut(BASE, outputAmount, _pool, member);
        emit Swapped(token, BASE, _actualAmount, 0, outputAmount, fee, member);
        return (outputAmount, fee);
    }

    function swap(uint256 inputAmount, address fromToken, address toToken) public payable returns (uint256 outputAmount, uint256 fee) {
        require(fromToken != toToken, "InputErr");
        address _poolFrom = getPool(fromToken); address _poolTo = getPool(toToken);
        Pool(_poolFrom)._checkApprovals();
        Pool(_poolTo)._checkApprovals();
        uint256 _actualAmount = _handleTransferIn(fromToken, inputAmount, _poolFrom);
        uint256 _transferAmount = 0;
        swapTx += 1;
        if(fromToken == BASE){
            (outputAmount, fee) = _swapBaseToToken(_poolFrom, _actualAmount);   // Buy to token
            totalStaked += _actualAmount;
            totalVolume += _actualAmount;
            totalFees += _DAO().UTILS().calcValueInBase(toToken, fee);
            addDividend(_poolFrom, fee);
        } else if(toToken == BASE) {
            (outputAmount, fee) = _swapTokenToBase(_poolFrom,_actualAmount);   // Sell to token
            totalStaked = totalStaked.sub(outputAmount);
            totalVolume += outputAmount;
            totalFees += fee;
            addDividend(_poolFrom, fee);
        } else {
            (uint256 _yy, uint256 _feey) = _swapTokenToBase(_poolFrom, _actualAmount);    // Sell to BASE
            totalVolume += _yy; totalFees += _feey;
            addDividend(_poolFrom, _feey);
            iBEP20(BASE).transferFrom(_poolFrom, _poolTo, _yy); 
            (uint256 _zz, uint256 _feez) = _swapBaseToToken(_poolTo, _yy);              // Buy to token
            totalFees += _DAO().UTILS().calcValueInBase(toToken, _feez);
            addDividend(_poolTo, _feez);
            _transferAmount = _yy; outputAmount = _zz; 
            fee = _feez + _DAO().UTILS().calcValueInToken(toToken, _feey);
        }
        _handleTransferOut(toToken, outputAmount, _poolTo, msg.sender);
        emit Swapped(fromToken, toToken, _actualAmount, _transferAmount, outputAmount, fee, msg.sender);
        return (outputAmount, fee);
    }

    //==================================================================================//
    // Core swap logic

    function _swapBaseToToken(address pool, uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = Pool(pool).baseAmt();
        uint256 _Y = Pool(pool).tokenAmt();
        _y =  _DAO().UTILS().calcSwapOutput(_x, _X, _Y);
        _fee = _DAO().UTILS().calcSwapFee(_x, _X, _Y);
        Pool(pool)._setPoolAmounts(_X.add(_x), _Y.sub(_y));
        _updatePoolMetrics(pool, _y+_fee, _fee, false);
        return (_y, _fee);
    }

    function _swapTokenToBase(address pool, uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = Pool(pool).tokenAmt();
        uint256 _Y = Pool(pool).baseAmt();
        _y =  _DAO().UTILS().calcSwapOutput(_x, _X, _Y);
        _fee = _DAO().UTILS().calcSwapFee(_x, _X, _Y);
        Pool(pool)._setPoolAmounts(_Y.sub(_y), _X.add(_x));
        _updatePoolMetrics(pool, _y+_fee, _fee, true);
        return (_y, _fee);
    }

    // Update pool metrics
    function _updatePoolMetrics(address pool, uint256 _txSize, uint256 _fee, bool _toBase) internal {
        if(_toBase){
            Pool(pool)._addPoolMetrics(_txSize, _fee);
        } else {
            uint256 _txBase = _DAO().UTILS().calcValueInBaseWithPool(pool, _txSize);
            uint256 _feeBase = _DAO().UTILS().calcValueInBaseWithPool(pool, _fee);
            Pool(pool)._addPoolMetrics(_txBase, _feeBase);
        }
    }

    //==================================================================================//
    // Revenue Functions

    // Every swap, add dividend, based on size of fee compared to global average. 
    // average = 1000th of reserve
    // 10x Average = 100th of reserve, 0.1x Average = 10000th of reserve
    function addDividend(address _pool, uint256 _fee) private {
        uint256 one = 10**18;
        uint256 _averageFee = totalFees.div(swapTx);
        uint256 _feeAmount = _fee.mul(one).div(_averageFee);    // average is one
        uint256 _revenue = one.mul(feeFactor).div(_feeAmount); // one * 1000 / fee = 1000
        uint256 _reserveShare = reserve.div(_revenue);        // reserve / 1000
        mapPool_accruedRewards[_pool] = mapPool_accruedRewards[_pool].add(_reserveShare);
    }

    // Every stake/unstake check to increment era
    // Then distribute rewards to pool if any available
    function _checkRevenue(address _pool) private {
        if (now >= nextEraTime) {                                               // If new era
            currentEra += 1;                                                    // Increment Era
            nextEraTime = now + iBASE(BASE).secondsPerEra() + 100;              // Set next Era time with buffer
            uint256 reserve = iBEP20(BASE).balanceOf(address(this));               // Set current reserve
            emit NewEra(currentEra, nextEraTime, reserve);                      // Emit Event
        }
        if(!hasPaidRewardsInEra[_pool]){
            address _token = Pool(_pool).TOKEN();                      // Get token of pool
            uint256 _rewards = mapPool_accruedRewards[_pool];
            mapPool_accruedRewards[_pool] = 0;
            hasPaidRewardsInEra[_pool] = true;
            Pool(_pool).add(_token, _rewards);                         // Add dividend to pool
        }
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
                uint256 _amountWithoutFee = _burnSwapFee(_token, msg.sender, _amount);
                uint256 startBal = iBEP20(_token).balanceOf(_pool); 
                iBEP20(_token).transferFrom(msg.sender, _pool, _amountWithoutFee); 
                actual = iBEP20(_token).balanceOf(_pool).sub(startBal);
            }
        }
    }

    function _handleTransferOut(address _token, uint256 _amount, address _pool, address _recipient) internal {
        if(_amount > 0) {
            if (_token == address(0)) {
                // If BNB, then withdraw to BNB, then forward BNB to recipient
                iBEP20(WBNB).transferFrom(_pool, address(this), _amount);
                iWBNB(WBNB).withdraw(_amount);
                payable(_recipient).call{value:_amount}(""); 
            } else {
                uint256 _amountWithoutFee = _burnSwapFee(_token, _pool, _amount);
                iBEP20(_token).transferFrom(_pool, _recipient, _amountWithoutFee);
            }
        }
    }

    // Every swap, burn swap fee, which is only ever BASE
    function _burnSwapFee(address _token, address _address, uint256 _amount) internal returns(uint256){
        if(_token == BASE){
            if(_amount > swapFee){
                iBEP20(_token).burnFrom(_address, swapFee);
                _amount = _amount.sub(swapFee);
            } else {
                iBEP20(_token).burnFrom(_address, _amount);
                _amount = 0;
            }
        }
        return _amount;
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