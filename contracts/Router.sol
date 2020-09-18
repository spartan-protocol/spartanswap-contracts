// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

interface iBEP20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint);
    function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
    function transfer(address, uint) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function approve(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
}
interface iBASE {
    function secondsPerEra() external view returns (uint);
    function DAO() external view returns (iDAO);
}
interface iUTILS {
    function calcPart(uint bp, uint total) external pure returns (uint part);
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    function calcSwapOutput(uint x, uint X, uint Y) external pure returns (uint output);
    function calcSwapFee(uint x, uint X, uint Y) external pure returns (uint output);
    function calcStakeUnits(uint b, uint B, uint t, uint T, uint P) external pure returns (uint units);
    function getPoolShare(address token, uint units) external view returns(uint baseAmt, uint tokenAmt);
    function getPoolShareAssym(address token, uint units, bool toBase) external view returns(uint baseAmt, uint tokenAmt, uint outputAmt);
    function calcValueInBase(address token, uint amount) external view returns (uint value);
    function calcValueInToken(address token, uint amount) external view returns (uint value);
    function calcValueInBaseWithPool(address payable pool, uint amount) external view returns (uint value);
}
interface iDAO {
    function ROUTER() external view returns(address);
    function UTILS() external view returns(iUTILS);
}

// SafeMath
library SafeMath {

    function add(uint a, uint b) internal pure returns (uint)   {
        uint c = a + b;
        assert(c >= a);
        return c;
    }

    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) {
            return 0;
        }
        uint c = a * b;
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
    using SafeMath for uint;

    address public BASE;
    address public TOKEN;

    uint public one = 10**18;

    // ERC-20 Parameters
    string _name; string _symbol;
    uint public override decimals; uint public override totalSupply;
    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    uint public genesis;
    uint public baseAmt;
    uint public tokenAmt;
    uint public baseAmtStaked;
    uint public tokenAmtStaked;
    uint public fees;
    uint public volume;
    uint public txCount;
    
    // Only Router can execute
    modifier onlyRouter() {
        _isRouter();
        _;
    }

    function _isRouter() internal view {
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

        if(_token == address(0)){
            _name = string(abi.encodePacked(poolName, "Binance Coin"));
            _symbol = string(abi.encodePacked(poolSymbol, "BNB"));
        } else {
            _name = string(abi.encodePacked(poolName, iBEP20(_token).name()));
            _symbol = string(abi.encodePacked(poolSymbol, iBEP20(_token).symbol()));
        }
        
        decimals = 18;
        genesis = now;
    }

    function _checkApprovals() external onlyRouter{
        if(iBEP20(BASE).allowance(address(this), _DAO().ROUTER()) == 0){
            if(TOKEN != address(0)){
                iBEP20(TOKEN).approve(_DAO().ROUTER(), uint(-1));
            }
            iBEP20(BASE).approve(_DAO().ROUTER(), uint(-1));
        }
    }

    receive() external payable {}

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
    function transfer(address to, uint value) public override returns (bool success) {
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
    function transferFrom(address from, address to, uint value) public override returns (bool success) {
        require(value <= _allowances[from][msg.sender], 'AllowanceErr');
        _allowances[from][msg.sender] = _allowances[from][msg.sender].sub(value);
        __transfer(from, to, value);
        return true;
    }

    // Internal transfer function
    function __transfer(address _from, address _to, uint _value) private {
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
    function burnFrom(address from, uint256 value) public virtual {
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

    // BNB Transfer function
    function transferETH(address payable to, uint value) public payable onlyRouter returns (bool success) {
        to.call{value:value}(""); 
        return true;
    }

    // Allow anyone to sync balances in case of issues
    function sync() public {
        if (TOKEN == address(0)) {
            tokenAmt = address(this).balance;
        } else {
            tokenAmt = iBEP20(TOKEN).balanceOf(address(this));
        }
        baseAmt = iBEP20(BASE).balanceOf(address(this));
    }

    // Allow anyone to add a dividend into the pool
    function add(address token, uint amount) public payable returns (bool success) {
        if(token == BASE){
            iBEP20(BASE).transferFrom(msg.sender, address(this), amount);
            baseAmt = baseAmt.add(amount);
            return true;
        } else if (token == TOKEN){
            iBEP20(TOKEN).transferFrom(msg.sender, address(this), amount);
            tokenAmt = tokenAmt.add(amount); 
            return true;
        } else if (token == address(0)){
            require((amount == msg.value), "InputErr");
            tokenAmt = tokenAmt.add(amount); 
        } else {
            return false;
        }
    } 

    //==================================================================================//
    // Data Model

    // Set internal balances
    function _setPoolBalances(uint _baseAmt, uint _tokenAmt, uint _baseAmtStaked, uint _tokenAmtStaked)  external onlyRouter  {
        baseAmtStaked = _baseAmtStaked;
        tokenAmtStaked = _tokenAmtStaked; 
        __setPool(_baseAmt, _tokenAmt);
    }

    // Increment internal balances
    function _incrementPoolBalances(uint _baseAmt, uint _tokenAmt)  external onlyRouter  {
        baseAmt += _baseAmt;
        tokenAmt += _tokenAmt;
        baseAmtStaked += _baseAmt;
        tokenAmtStaked += _tokenAmt; 
    }
    function _setPoolAmounts(uint _baseAmt, uint _tokenAmt)  external onlyRouter  {
        __setPool(_baseAmt, _tokenAmt); 
    }
    function __setPool(uint _baseAmt, uint _tokenAmt) internal  {
        baseAmt = _baseAmt;
        tokenAmt = _tokenAmt; 
    }

    // Decrement internal balances
    function _decrementPoolBalances(uint _baseAmt, uint _tokenAmt)  external onlyRouter  {
        uint _unstakedBase = _DAO().UTILS().calcShare(_baseAmt, baseAmt, baseAmtStaked);
        uint _unstakedToken = _DAO().UTILS().calcShare(_tokenAmt, tokenAmt, tokenAmtStaked);
        baseAmtStaked = baseAmtStaked.sub(_unstakedBase);
        tokenAmtStaked = tokenAmtStaked.sub(_unstakedToken); 
        __decrementPool(_baseAmt, _tokenAmt); 
    }
    function __decrementPool(uint _baseAmt, uint _tokenAmt) internal  {
        baseAmt = baseAmt.sub(_baseAmt);
        tokenAmt = tokenAmt.sub(_tokenAmt); 
    }

    // Add metrics
    function _addPoolMetrics(uint _volume, uint _fee) external onlyRouter  {
        txCount += 1;
        volume += _volume;
        fees += _fee;
    }

}

contract Router {

    using SafeMath for uint;

    address public BASE;
    address public DEPLOYER;

    uint public totalStaked; 
    uint public totalVolume;
    uint public totalFees;
    uint public unstakeTx;
    uint public stakeTx;
    uint public swapTx;

    address[] public arrayTokens;
    mapping(address=>address payable) private mapToken_Pool;
    mapping(address=>bool) public isPool;

    event NewPool(address token, address pool, uint genesis);
    event Staked(address member, uint inputBase, uint inputToken, uint unitsIssued);
    event Unstaked(address member, uint outputBase, uint outputToken, uint unitsClaimed);
    event Swapped(address tokenFrom, address tokenTo, uint inputAmount, uint transferAmount, uint outputAmount, uint fee, address recipient);

    // Only Deployer can execute
    modifier onlyDeployer() {
        require(msg.sender == DEPLOYER, "DeployerErr");
        _;
    }

    constructor (address _base) public payable {
        BASE = _base;
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
        totalStaked = Router(oldRouter).totalStaked();
        totalVolume = Router(oldRouter).totalVolume();
        totalFees = Router(oldRouter).totalFees();
        unstakeTx = Router(oldRouter).unstakeTx();
        stakeTx = Router(oldRouter).stakeTx();
        swapTx = Router(oldRouter).swapTx();
    }
    // Can migrate registry
    function migrateTokenData(address payable oldRouter) public onlyDeployer {
        uint tokenCount = Router(oldRouter).tokenCount();
        for(uint i = 0; i<tokenCount; i++){
            address token = Router(oldRouter).getToken(i);
            address payable pool = Router(oldRouter).getPool(token);
            isPool[pool] = true;
            arrayTokens.push(token);
            mapToken_Pool[token] = pool;
        }
    }

    function purgeDeployer() public onlyDeployer {
        DEPLOYER = address(0);
    }


    //==================================================================================//
    // Staking functions

    function createPool(uint inputBase, uint inputToken, address token) public payable returns(address payable pool){
        require(getPool(token) == address(0), "CreateErr");
        require(token != BASE, "Must not be Base");
        require((inputToken > 0 && inputBase > 0), "Must get tokens for both");
        Pool newPool = new Pool(BASE, token);
        pool = payable(address(newPool));
        uint _actualInputToken = _handleTransferIn(token, inputToken, pool);
        uint _actualInputBase = _handleTransferIn(BASE, inputBase, pool);
        mapToken_Pool[token] = pool;
        arrayTokens.push(token);
        isPool[pool] = true;
        totalStaked += _actualInputBase;
        stakeTx += 1;
        uint units = _handleStake(pool, _actualInputBase, _actualInputToken, msg.sender);
        emit NewPool(token, pool, now);
        emit Staked(msg.sender, _actualInputBase, _actualInputToken, units);
        return pool;
    }

    function stake(uint inputBase, uint inputToken, address token) public payable returns (uint units) {
        units = stakeForMember(inputBase, inputToken, token, msg.sender);
        return units;
    }

    function stakeForMember(uint inputBase, uint inputToken, address token, address member) public payable returns (uint units) {
        address payable pool = getPool(token);
        uint _actualInputToken = _handleTransferIn(token, inputToken, pool);
        uint _actualInputBase = _handleTransferIn(BASE, inputBase, pool);
        totalStaked += _actualInputBase;
        stakeTx += 1;
        units = _handleStake(pool, _actualInputBase, _actualInputToken, member);
        emit Staked(member, _actualInputBase, _actualInputToken, units);
        return units;
    }


    function _handleStake(address payable pool, uint _baseAmt, uint _tokenAmt, address _member) internal returns (uint _units) {
        Pool(pool)._checkApprovals();
        uint _B = Pool(pool).baseAmt();
        uint _T = Pool(pool).tokenAmt();
        uint _P = iBEP20(pool).totalSupply();
        Pool(pool)._incrementPoolBalances(_baseAmt, _tokenAmt);                                                  
        _units = _DAO().UTILS().calcStakeUnits(_baseAmt, _B, _tokenAmt, _T, _P);  
        Pool(pool)._mint(_member, _units);
        return _units;
    }

    //==================================================================================//
    // Unstaking functions

    // Unstake % for self
    function unstake(uint basisPoints, address token) public returns (bool success) {
        require((basisPoints > 0 && basisPoints <= 10000), "InputErr");
        uint _units = _DAO().UTILS().calcPart(basisPoints, iBEP20(getPool(token)).balanceOf(msg.sender));
        unstakeExact(_units, token);
        return true;
    }

    // Unstake an exact qty of units
    function unstakeExact(uint units, address token) public returns (bool success) {
        address payable pool = getPool(token);
        address payable member = msg.sender;
        (uint _outputBase, uint _outputToken) = _DAO().UTILS().getPoolShare(token, units);
        totalStaked = totalStaked.sub(_outputBase);
        unstakeTx += 1;
        _handleUnstake(pool, units, _outputBase, _outputToken, member);
        emit Unstaked(member, _outputBase, _outputToken, units);
        _handleTransferOut(token, _outputToken, pool, member);
        _handleTransferOut(BASE, _outputBase, pool, member);
        return true;
    }

    // // Unstake % Asymmetrically
    function unstakeAsymmetric(uint basisPoints, bool toBase, address token) public returns (uint outputAmount){
        uint _units = _DAO().UTILS().calcPart(basisPoints, iBEP20(getPool(token)).balanceOf(msg.sender));
        outputAmount = unstakeExactAsymmetric(_units, toBase, token);
        return outputAmount;
    }
    // Unstake Exact Asymmetrically
    function unstakeExactAsymmetric(uint units, bool toBase, address token) public returns (uint outputAmount){
        address payable pool = getPool(token);
        require(units < iBEP20(pool).totalSupply(), "InputErr");
        (uint _outputBase, uint _outputToken, uint _outputAmount) = _DAO().UTILS().getPoolShareAssym(token, units, toBase);
        totalStaked = totalStaked.sub(_outputBase);
        unstakeTx += 1;
        _handleUnstake(pool, units, _outputBase, _outputToken, msg.sender);
        emit Unstaked(msg.sender, _outputBase, _outputToken, units);
        _handleTransferOut(token, _outputToken, pool, msg.sender);
        _handleTransferOut(BASE, _outputBase, pool, msg.sender);
        return _outputAmount;
    }

    function _handleUnstake(address payable pool, uint _units, uint _outputBase, uint _outputToken, address _member) internal returns (bool success) {
        Pool(pool)._checkApprovals();
        Pool(pool)._decrementPoolBalances(_outputBase, _outputToken);
        Pool(pool).burnFrom(_member, _units);
        return true;
    } 

    //==================================================================================//
    // Universal Swapping Functions

    function buy(uint amount, address token) public payable returns (uint outputAmount, uint fee){
        (outputAmount, fee) = buyTo(amount, token, msg.sender);
        return (outputAmount, fee);
    }
    function buyTo(uint amount, address token, address payable member) public payable returns (uint outputAmount, uint fee) {
        address payable pool = getPool(token);
        Pool(pool)._checkApprovals();
        uint _actualAmount = _handleTransferIn(BASE, amount, pool);
        (outputAmount, fee) = _swapBaseToToken(pool, _actualAmount);
        totalStaked += _actualAmount;
        totalVolume += _actualAmount;
        totalFees += _DAO().UTILS().calcValueInBase(token, fee);
        swapTx += 1;
        _handleTransferOut(token, outputAmount, pool, member);
        emit Swapped(BASE, token, _actualAmount, 0, outputAmount, fee, member);
        return (outputAmount, fee);
    }

    function sell(uint amount, address token) public payable returns (uint outputAmount, uint fee){
        (outputAmount, fee) = sellTo(amount, token, msg.sender);
        return (outputAmount, fee);
    }
    function sellTo(uint amount, address token, address payable member) public payable returns (uint outputAmount, uint fee) {
        address payable pool = getPool(token);
        Pool(pool)._checkApprovals();
        uint _actualAmount = _handleTransferIn(token, amount, pool);
        (outputAmount, fee) = _swapTokenToBase(pool, _actualAmount);
        totalStaked = totalStaked.sub(outputAmount);
        totalVolume += outputAmount;
        totalFees += fee;
        swapTx += 1;
        _handleTransferOut(BASE, outputAmount, pool, member);
        emit Swapped(token, BASE, _actualAmount, 0, outputAmount, fee, member);
        return (outputAmount, fee);
    }

    function swap(uint inputAmount, address fromToken, address toToken) public payable returns (uint outputAmount, uint fee) {
        require(fromToken != toToken, "InputErr");
        address payable poolFrom = getPool(fromToken); address payable poolTo = getPool(toToken);
        Pool(poolFrom)._checkApprovals();
        Pool(poolTo)._checkApprovals();
        uint _actualAmount = _handleTransferIn(fromToken, inputAmount, poolFrom);
        uint _transferAmount = 0;
        if(fromToken == BASE){
            (outputAmount, fee) = _swapBaseToToken(poolFrom, _actualAmount);      // Buy to token
            totalStaked += _actualAmount;
            totalVolume += _actualAmount;
        } else if(toToken == BASE) {
            (outputAmount, fee) = _swapTokenToBase(poolFrom,_actualAmount);   // Sell to token
            totalStaked = totalStaked.sub(outputAmount);
            totalVolume += outputAmount;
        } else {
            (uint _yy, uint _feey) = _swapTokenToBase(poolFrom, _actualAmount);             // Sell to BASE
            totalVolume += _yy; totalFees += _feey;
            iBEP20(BASE).transferFrom(poolFrom, poolTo, _yy); 
            (uint _zz, uint _feez) = _swapBaseToToken(poolTo, _yy);              // Buy to token
            totalFees += _DAO().UTILS().calcValueInBase(toToken, _feez);
            _transferAmount = _yy; outputAmount = _zz; 
            fee = _feez + _DAO().UTILS().calcValueInToken(toToken, _feey);
        }
        swapTx += 1;
        _handleTransferOut(toToken, outputAmount, poolTo, msg.sender);
        emit Swapped(fromToken, toToken, _actualAmount, _transferAmount, outputAmount, fee, msg.sender);
        return (outputAmount, fee);
    }

    function _swapBaseToToken(address payable pool, uint _x) internal returns (uint _y, uint _fee){
        uint _X = Pool(pool).baseAmt();
        uint _Y = Pool(pool).tokenAmt();
        _y =  _DAO().UTILS().calcSwapOutput(_x, _X, _Y);
        _fee = _DAO().UTILS().calcSwapFee(_x, _X, _Y);
        Pool(pool)._setPoolAmounts(_X.add(_x), _Y.sub(_y));
        _updatePoolMetrics(pool, _y+_fee, _fee, false);
        return (_y, _fee);
    }

    function _swapTokenToBase(address payable pool, uint _x) internal returns (uint _y, uint _fee){
        uint _X = Pool(pool).tokenAmt();
        uint _Y = Pool(pool).baseAmt();
        _y =  _DAO().UTILS().calcSwapOutput(_x, _X, _Y);
        _fee = _DAO().UTILS().calcSwapFee(_x, _X, _Y);
        Pool(pool)._setPoolAmounts(_Y.sub(_y), _X.add(_x));
        _updatePoolMetrics(pool, _y+_fee, _fee, true);
        return (_y, _fee);
    }

    function _updatePoolMetrics(address payable pool, uint _txSize, uint _fee, bool _toBase) internal {
        if(_toBase){
            Pool(pool)._addPoolMetrics(_txSize, _fee);
        } else {
            uint _txBase = _DAO().UTILS().calcValueInBaseWithPool(pool, _txSize);
            uint _feeBase = _DAO().UTILS().calcValueInBaseWithPool(pool, _fee);
            Pool(pool)._addPoolMetrics(_txBase, _feeBase);
        }
    }

    //==================================================================================//
    // Token Transfer Functions

    function _handleTransferIn(address _token, uint _amount, address _pool) internal returns(uint actual){
        if(_amount > 0) {
            if(_token == address(0)){
                require((_amount == msg.value), "InputErr");
                payable(_pool).call{value:_amount}(""); 
                actual = _amount;
            } else {
                uint startBal = iBEP20(_token).balanceOf(_pool); 
                iBEP20(_token).transferFrom(msg.sender, _pool, _amount); 
                actual = iBEP20(_token).balanceOf(_pool).sub(startBal);
            }
        }
    }

    function _handleTransferOut(address _token, uint _amount, address _pool, address payable _recipient) internal {
        if(_amount > 0) {
            if (_token == address(0)) {
                Pool(payable(_pool)).transferETH(_recipient, _amount);
            } else {
                iBEP20(_token).transferFrom(_pool, _recipient, _amount);
            }
        }
    }

    //======================================HELPERS========================================//
    // Helper Functions

    function getPool(address token) public view returns(address payable pool){
        return mapToken_Pool[token];
    }

    function tokenCount() public view returns(uint){
        return arrayTokens.length;
    }

    function getToken(uint i) public view returns(address){
        return arrayTokens[i];
    }

}