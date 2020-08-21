// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

interface iERC20 {
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
interface iMATH {
    function calcPart(uint bp, uint total) external pure returns (uint part);
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    function calcSwapOutput(uint x, uint X, uint Y) external pure returns (uint output);
    function calcSwapFee(uint x, uint X, uint Y) external pure returns (uint output);
    function calcStakeUnits(uint a, uint A, uint v, uint S) external pure returns (uint units);
    function calcAsymmetricShare(uint s, uint T, uint A) external pure returns (uint share);
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
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        return c;
    }
}

contract SPool is iERC20 {
    using SafeMath for uint;

    address public SPARTA;
    address public TOKEN;
    address public router;
    iMATH public math;
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
    
    mapping(address => uint) private member_baseAmtStaked;
    mapping(address => uint) private member_tokenAmtStaked;
   
    // Only Router can execute
    modifier onlyRouter() {
        require(msg.sender == router, "Must be Router");
        _;
    }

    constructor (address _sparta, address _token, iMATH _math) public payable {
        //local
        SPARTA = _sparta;
        TOKEN = _token;
        router = msg.sender;
        math = _math;

        if(_token == address(0)){
            _name = "SpartanPoolV1-BinanceCoin";
            _symbol = "SPT1-BNB";
        } else {
            string memory tokenName = iERC20(_token).name();
            _name = string(abi.encodePacked("SpartanPoolV1-", tokenName));
            string memory tokenSymbol = iERC20(_token).symbol();
            _symbol = string(abi.encodePacked("SPT1-", tokenSymbol));
            iERC20(_token).approve(router, (2**256)-1);
        }

        decimals = 18;
        genesis = now;
        _allowances[address(this)][router] = (2**256)-1;
        iERC20(SPARTA).approve(router, (2**256)-1);
    }

    receive() external payable {}

    //========================================iERC20=========================================//
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
    // iERC20 Transfer function
    function transfer(address to, uint value) public override returns (bool success) {
        _transfer(msg.sender, to, value);
        return true;
    }
    // iERC20 Approve function
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    // iERC20 TransferFrom function
    function transferFrom(address from, address to, uint value) public override returns (bool success) {
        require(value <= _allowances[from][msg.sender], 'Must not send more than allowance');
        _allowances[from][msg.sender] = _allowances[from][msg.sender].sub(value);
        _transfer(from, to, value);
        return true;
    }

    // Internal transfer function
    function _transfer(address _from, address _to, uint _value) private {
        require(_balances[_from] >= _value, 'Must not send more than balance');
        require(_balances[_to] + _value >= _balances[_to], 'Balance overflow');
        _balances[_from] =_balances[_from].sub(_value);
        _balances[_to] += _value;
        emit Transfer(_from, _to, _value);
    }

    // Internal mint
    function _mint(address account, uint256 amount) internal virtual {
        totalSupply = totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }
    // Burn supply
    function burn(uint256 amount) public virtual {
        _burn(msg.sender, amount);
    }
    function burnFrom(address account, uint256 amount) public virtual {
        uint256 decreasedAllowance = allowance(account, msg.sender).sub(amount, "Burn amount exceeds allowance");
        _approve(account, msg.sender, decreasedAllowance);
        _burn(account, amount);
    }
    function _burn(address account, uint256 amount) internal virtual {
        _balances[account] = _balances[account].sub(amount, "Burn amount exceeds balance");
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    //==================================================================================//
    // Staking functions

    function _handleStake(uint _baseAmt, uint _tokenAmt, address _member) external onlyRouter returns (uint _units) {
        uint _S = baseAmt.add(_baseAmt);
        uint _A = tokenAmt.add(_tokenAmt);
        _incrementPoolBalances(_baseAmt, _tokenAmt);                                                  
        _addDataForMember(_member, _baseAmt, _tokenAmt);
        _units = math.calcStakeUnits(_tokenAmt, _A, _baseAmt, _S);  
        _mint(_member, _units);
        return _units;
    }

    //==================================================================================//
    // Unstaking functions

    function _handleUnstake(uint _units, uint _outputBase, uint _outputToken, address _member) public onlyRouter returns (bool success) {
        _decrementPoolBalances(_outputBase, _outputToken);
        _removeDataForMember(_member, _units);
        _burn(_member, _units);
        return true;
    } 

    //==================================================================================//
    // Swapping functions

    function _swapBaseToToken(uint _x) external onlyRouter returns (uint _y, uint _fee){
        uint _X = baseAmt;
        uint _Y = tokenAmt;
        _y =  math.calcSwapOutput(_x, _X, _Y);
        _fee = math.calcSwapFee(_x, _X, _Y);
        baseAmt = baseAmt.add(_x);
        tokenAmt = tokenAmt.sub(_y);
        _updatePoolMetrics(_y+_fee, _fee, false);
        return (_y, _fee);
    }

    function _swapTokenToBase(uint _x) external onlyRouter returns (uint _y, uint _fee){
        uint _X = tokenAmt;
        uint _Y = baseAmt;
        _y =  math.calcSwapOutput(_x, _X, _Y);
        _fee = math.calcSwapFee(_x, _X, _Y);
        tokenAmt = tokenAmt.add(_x);
        baseAmt = baseAmt.sub(_y);
        _updatePoolMetrics(_y+_fee, _fee, true);
        return (_y, _fee);
    }

    //==================================================================================//
    // Data Model

    function _incrementPoolBalances(uint _baseAmt, uint _tokenAmt) internal {
        baseAmt = baseAmt.add(_baseAmt);
        tokenAmt = tokenAmt.add(_tokenAmt); 
        baseAmtStaked = baseAmtStaked.add(_baseAmt);
        tokenAmtStaked = tokenAmtStaked.add(_tokenAmt); 
    }

    function _decrementPoolBalances(uint _baseAmt, uint _tokenAmt) internal {
        uint _unstakedBase = math.calcShare(_baseAmt, baseAmt, baseAmtStaked);
        uint _unstakedToken = math.calcShare(_tokenAmt, tokenAmt, tokenAmtStaked);
        baseAmtStaked = baseAmtStaked.sub(_unstakedBase);
        tokenAmtStaked = tokenAmtStaked.sub(_unstakedToken); 
        baseAmt = baseAmt.sub(_baseAmt);
        tokenAmt = tokenAmt.sub(_tokenAmt); 
    }

    function _addDataForMember(address _member, uint _baseAmt, uint _tokenAmt) internal {
        member_baseAmtStaked[_member] = member_baseAmtStaked[_member].add(_baseAmt);
        member_tokenAmtStaked[_member] = member_tokenAmtStaked[_member].add(_tokenAmt);
    }

    function _removeDataForMember(address _member, uint _units) internal{
        uint stakeUnits = balanceOf(_member);
        uint _baseAmt = math.calcShare(_units, stakeUnits, member_baseAmtStaked[_member]);
        uint _tokenAmt = math.calcShare(_units, stakeUnits, member_tokenAmtStaked[_member]);
        member_baseAmtStaked[_member] = member_baseAmtStaked[_member].sub(_baseAmt);
        member_tokenAmtStaked[_member] = member_tokenAmtStaked[_member].sub(_tokenAmt);
    }

    function _updatePoolMetrics(uint _tx, uint _fee, bool _toBase) internal {
        txCount += 1;
        uint _volume = volume;
        uint _fees = fees;
        if(_toBase){
            volume = _tx.add(_volume); 
            fees = _fee.add(_fees); 
        } else {
            uint _txBase = calcValueInBase(_tx);
            uint _feeBase = calcValueInBase(_fee);
            volume = _volume.add(_txBase); 
            fees = _fees.add(_feeBase); 
        }
    }

    //==================================================================================//
    // Token Functions

    // TransferTo function
    function transferTo(address recipient, uint256 amount) public returns (bool) {
        _transfer(tx.origin, recipient, amount);
        return true;
    }

    // ETH Transfer function
    function transferETH(address payable to, uint value) public payable onlyRouter returns (bool success) {
        to.call{value:value}(""); 
        return true;
    }

    function sync() public {
        if (TOKEN == address(0)) {
            tokenAmt = address(this).balance;
        } else {
            tokenAmt = iERC20(TOKEN).balanceOf(address(this));
        }
    }

    //==================================================================================//
    // Helper functions

    function getBaseAmtStaked(address member) public view returns(uint){
        return member_baseAmtStaked[member];
    }
    function getTokenAmtStaked(address member) public view returns(uint){
        return member_tokenAmtStaked[member];
    }

    function calcValueInBase(uint a) public view returns (uint value){
       return (a.mul(baseAmt)).div(tokenAmt);
    }

    function calcValueInToken(uint v) public view returns (uint value){
        return (v.mul(tokenAmt)).div(baseAmt);
    }

   function calcTokenPPinBase(uint amount) public view returns (uint _output){
        return  math.calcSwapOutput(amount, tokenAmt, baseAmt);
    }

    function calcBasePPinToken(uint amount) public view returns (uint _output){
        return  math.calcSwapOutput(amount, baseAmt, tokenAmt);
    }
}

contract SRouter {

    using SafeMath for uint;

    address public SPARTA;
    iMATH public math;

    struct TokenDetails {
        string name;
        string symbol;
        uint decimals;
        uint totalSupply;
    }

    uint totalStaked; 
    uint allTimeVolume;
    uint allTimeTx;
    struct GlobalDetails {
        uint totalStaked;
        uint allTimeVolume;
        uint allTimeTx;
    }

    struct PoolDataStruct {
        uint genesis;
        uint baseAmt;
        uint tokenAmt;
        uint baseAmtStaked;
        uint tokenAmtStaked;
        uint fees;
        uint volume;
        uint txCount;
        uint poolUnits;
    }
    struct MemberDataStruct {
        uint baseAmtStaked;
        uint tokenAmtStaked;
        uint stakerUnits;
    }

    address[] arrayTokens;
    mapping(address=>address payable) private mapToken_Pool;

    event Staked(address member, uint inputBase, uint inputToken, uint unitsIssued);
    event Unstaked(address member, uint outputBase, uint outputToken, uint unitsClaimed);
    event Swapped(address tokenFrom, address tokenTo, uint inputAmount, uint transferAmount, uint outputAmount, uint fee, address recipient);


    constructor () public payable {
        SPARTA = 0x0C1d8c5911A1930ab68b3277D35f45eEd25e1F26;
        math = iMATH(0xeB1AF950Afe997F8401CdbDd9A3BdA4f1E5D3B6a);
    }

    function createPool(uint inputBase, uint inputToken, address token) public payable returns(address payable pool){
        require(getPool(token) == address(0), "Must not be created already");
        require(token != SPARTA, "Token must not be Sparta");
        require((inputToken > 0 && inputBase > 0), "Must get both tokens for new pool");
        SPool newPool = new SPool(SPARTA, token, math);
        pool = payable(address(newPool));
        uint _actualInputToken = _handleTransferIn(token, inputToken, pool);
        uint _actualInputBase = _handleTransferIn(SPARTA, inputBase, pool);
        mapToken_Pool[token] = pool;
        arrayTokens.push(token);
        totalStaked += _actualInputBase;
        allTimeTx += 1;
        SPool(pool)._handleStake(_actualInputBase, _actualInputToken, msg.sender);
        return pool;
    }

    //==================================================================================//
    // Staking functions

    function stake(uint inputBase, uint inputToken, address token) public payable returns (uint units) {
        units = stakeForMember(inputBase, inputToken, token, msg.sender);
        return units;
    }

    function stakeForMember(uint inputBase, uint inputToken, address token, address member) public payable returns (uint units) {
        address payable pool = getPool(token);
        uint _actualInputToken = _handleTransferIn(token, inputToken, pool);
        uint _actualInputBase = _handleTransferIn(SPARTA, inputBase, pool);
        units = SPool(pool)._handleStake(_actualInputBase, _actualInputToken, member);
        emit Staked(member, _actualInputBase, _actualInputToken, units);
        totalStaked += _actualInputBase;
        allTimeTx += 1;
        return units;
    }

    //==================================================================================//
    // Unstaking functions

    // Unstake % for self
    function unstake(uint basisPoints, address token) public returns (bool success) {
        require((basisPoints > 0 && basisPoints <= 10000), "Must be valid BasisPoints");
        uint _units = math.calcPart(basisPoints, iERC20(getPool(token)).balanceOf(msg.sender));
        unstakeExact(_units, token);
        return true;
    }

    // Unstake an exact qty of units
    function unstakeExact(uint units, address token) public returns (bool success) {
        address payable pool = getPool(token);
        address payable member = msg.sender;
        (uint _outputBase, uint _outputToken) = getPoolShare(token, units);
        SPool(pool)._handleUnstake(units, _outputBase, _outputToken, member);
        emit Unstaked(member, _outputBase, _outputToken, units);
        totalStaked = totalStaked.sub(_outputBase);
        allTimeTx += 1;
        _handleTransferOut(token, _outputToken, pool, member);
        _handleTransferOut(SPARTA, _outputBase, pool, member);
        return true;
    }

    // // Unstake % Asymmetrically
    function unstakeAsymmetric(uint basisPoints, bool toBase, address token) public returns (uint outputAmount){
        uint _units = math.calcPart(basisPoints, iERC20(getPool(token)).balanceOf(msg.sender));
        outputAmount = unstakeExactAsymmetric(_units, toBase, token);
        return outputAmount;
    }
    // Unstake Exact Asymmetrically
    function unstakeExactAsymmetric(uint units, bool toBase, address token) public returns (uint outputAmount){
        address payable pool = getPool(token);
        require(units < iERC20(pool).totalSupply(), "Must not be last staker");
        (uint _outputBase, uint _outputToken, uint _outputAmount) = getPoolShareAssym(token, units, toBase);
        SPool(pool)._handleUnstake(units, _outputBase, _outputToken, msg.sender);
        emit Unstaked(msg.sender, _outputBase, _outputToken, units);
        totalStaked = totalStaked.sub(_outputBase);
        allTimeTx += 1;
        _handleTransferOut(token, _outputToken, pool, msg.sender);
        _handleTransferOut(SPARTA, _outputBase, pool, msg.sender);
        return _outputAmount;
    }

    //==================================================================================//
    // Universal Swapping Functions

    function buy(uint amount, address token) public payable returns (uint outputAmount, uint fee){
        (outputAmount, fee) = buyTo(amount, token, msg.sender);
        return (outputAmount, fee);
    }
    function buyTo(uint amount, address token, address payable member) public payable returns (uint outputAmount, uint fee) {
        address payable pool = getPool(token);
        uint _actualAmount = _handleTransferIn(SPARTA, amount, pool);
        (outputAmount, fee) = SPool(pool)._swapBaseToToken(amount);
        emit Swapped(SPARTA, token, _actualAmount, 0, outputAmount, fee, member);
        totalStaked += _actualAmount;
        allTimeVolume += _actualAmount;
        allTimeTx += 1;
        _handleTransferOut(token, outputAmount, pool, member);
        return (outputAmount, fee);
    }

    function sell(uint amount, address token) public payable returns (uint outputAmount, uint fee){
        (outputAmount, fee) = sellTo(amount, token, msg.sender);
        return (outputAmount, fee);
    }
    function sellTo(uint amount, address token, address payable member) public payable returns (uint outputAmount, uint fee) {
        address payable pool = getPool(token);
        uint _actualAmount = _handleTransferIn(token, amount, pool);
        (outputAmount, fee) = SPool(pool)._swapTokenToBase(amount);
        emit Swapped(token, SPARTA, _actualAmount, 0, outputAmount, fee, member);
        totalStaked = totalStaked.sub(outputAmount);
        allTimeVolume += outputAmount;
        allTimeTx += 1;
        _handleTransferOut(SPARTA, outputAmount, pool, member);
        return (outputAmount, fee);
    }

    function swap(uint inputAmount, address fromToken, address toToken) public payable returns (uint outputAmount, uint fee) {
        require(fromToken != toToken, "Token must not be the same");
        address payable poolFrom = getPool(fromToken); address payable poolTo = getPool(toToken);
        uint _actualAmount = _handleTransferIn(fromToken, inputAmount, poolFrom);
        uint _transferAmount = 0;
        if(fromToken == SPARTA){
            (outputAmount, fee) = SPool(poolFrom)._swapBaseToToken(_actualAmount);      // Buy to token
            totalStaked += _actualAmount;
            allTimeVolume += _actualAmount;
        } else if(toToken == SPARTA) {
            (outputAmount, fee) = SPool(poolFrom)._swapTokenToBase(_actualAmount);   // Sell to token
            totalStaked = totalStaked.sub(outputAmount);
            allTimeVolume += outputAmount;
        } else {
            (uint _yy, uint _feey) = SPool(poolFrom)._swapTokenToBase(_actualAmount);             // Sell to SPARTA
            allTimeVolume += _yy;
            iERC20(SPARTA).transferFrom(poolFrom, poolTo, _yy); 
            (uint _zz, uint _feez) = SPool(poolTo)._swapBaseToToken(_yy);              // Buy to token
            _transferAmount = _yy; outputAmount = _zz; 
            fee = _feez + SPool(poolTo).calcValueInToken(_feey);
        }
        emit Swapped(fromToken, toToken, _actualAmount, _transferAmount, outputAmount, fee, msg.sender);
        allTimeTx += 1;
        _handleTransferOut(toToken, outputAmount, poolTo, msg.sender);
        return (outputAmount, fee);
    }

    //==================================================================================//
    // Token Transfer Functions

    function _handleTransferIn(address _token, uint _amount, address _pool) internal returns(uint actual){
        if(_amount > 0) {
            if(_token == address(0)){
                require((_amount == msg.value), "Must get Eth");
                payable(_pool).call{value:_amount}(""); 
                actual = _amount;
            } else {
                uint startBal = iERC20(_token).balanceOf(_pool); 
                iERC20(_token).transferFrom(msg.sender, _pool, _amount); 
                actual = iERC20(_token).balanceOf(_pool).sub(startBal);
            }
        }
    }

    function _handleTransferOut(address _token, uint _amount, address _pool, address payable _recipient) internal {
        if(_amount > 0) {
            if (_token == address(0)) {
                SPool(payable(_pool)).transferETH(_recipient, _amount);
            } else {
                iERC20(_token).transferFrom(_pool, _recipient, _amount);
            }
        }
    }

    //======================================HELPERS========================================//
    // Helper Functions

    function getTokenDetails(address token) public view returns (TokenDetails memory tokenDetails){
        if(token == address(0)){
            tokenDetails.name = 'Binance Chain Token';
            tokenDetails.symbol = 'BNB';
            tokenDetails.decimals = 18;
            tokenDetails.totalSupply = 100000000 * 10**18;
        } else {
            tokenDetails.name = iERC20(token).name();
            tokenDetails.symbol = iERC20(token).symbol();
            tokenDetails.decimals = iERC20(token).decimals();
            tokenDetails.totalSupply = iERC20(token).totalSupply();
        }
        return tokenDetails;
    }

    function getGlobalDetails() public view returns (GlobalDetails memory globalDetails){
        globalDetails.totalStaked = totalStaked;
        globalDetails.allTimeVolume = allTimeVolume;
        globalDetails.allTimeTx = allTimeTx;
        return globalDetails;
    }

    function getPool(address token) public view returns(address payable pool){
        return mapToken_Pool[token];
    }

    function tokenCount() public view returns (uint256 count){
        return arrayTokens.length;
    }
    function allTokens() public view returns (address[] memory _allTokens){
        return arrayTokens;
    }
    function tokensInRange(uint start, uint count) public view returns (address[] memory someTokens){
        if(start.add(count) > tokenCount()){
            count = tokenCount().sub(start);
        }
        address[] memory result = new address[](count);
        for (uint i = 0; i < count; i++){
            result[i] = arrayTokens[i];
        }
        return result;
    }
    function allPools() public view returns (address[] memory _allPools){
        return poolsInRange(0, tokenCount());
    }
    function poolsInRange(uint start, uint count) public view returns (address[] memory somePools){
        if(start.add(count) > tokenCount()){
            count = tokenCount().sub(start);
        }
        address[] memory result = new address[](count);
        for (uint i = 0; i<count; i++){
            result[i] = mapToken_Pool[arrayTokens[i]];
        }
        return result;
    }

    function getPoolData(address token) public view returns(PoolDataStruct memory poolData){
        address payable pool = getPool(token);
        poolData.genesis = SPool(pool).genesis();
        poolData.baseAmt = SPool(pool).baseAmt();
        poolData.tokenAmt = SPool(pool).tokenAmt();
        poolData.baseAmtStaked = SPool(pool).baseAmtStaked();
        poolData.tokenAmtStaked = SPool(pool).tokenAmtStaked();
        poolData.fees = SPool(pool).fees();
        poolData.volume = SPool(pool).volume();
        poolData.txCount = SPool(pool).txCount();
        poolData.poolUnits = iERC20(pool).totalSupply();
        return poolData;
    }

    function getMemberShare(address token, address member) public view returns(uint baseAmt, uint tokenAmt){
        address pool = getPool(token);
        uint units = iERC20(pool).balanceOf(member);
        return getPoolShare(token, units);
    }

    function getPoolShare(address token, uint units) public view returns(uint baseAmt, uint tokenAmt){
        address payable pool = getPool(token);
        baseAmt = math.calcShare(units, iERC20(pool).totalSupply(), SPool(pool).baseAmt());
        tokenAmt = math.calcShare(units, iERC20(pool).totalSupply(), SPool(pool).tokenAmt());
        return (baseAmt, tokenAmt);
    }

    function getPoolShareAssym(address token, uint units, bool toBase) public view returns(uint baseAmt, uint tokenAmt, uint outputAmt){
        address payable pool = getPool(token);
        if(toBase){
            baseAmt = math.calcAsymmetricShare(units, iERC20(pool).totalSupply(), SPool(pool).baseAmt());
            tokenAmt = 0;
            outputAmt = baseAmt;
        } else {
            baseAmt = 0;
            tokenAmt = math.calcAsymmetricShare(units, iERC20(pool).totalSupply(), SPool(pool).tokenAmt());
            outputAmt = tokenAmt;
        }
        return (baseAmt, tokenAmt, outputAmt);
    }

    function getMemberData(address token, address member) public view returns(MemberDataStruct memory memberData){
        address payable pool = getPool(token);
        memberData.baseAmtStaked = SPool(pool).getBaseAmtStaked(member);
        memberData.tokenAmtStaked = SPool(pool).getTokenAmtStaked(member);
        memberData.stakerUnits = iERC20(pool).balanceOf(member);
        return memberData;
    }

    function getPoolAge(address token) public view returns (uint daysSinceGenesis){
        address payable pool = getPool(token);
        uint genesis = SPool(pool).genesis();
        if(now < genesis.add(86400)){
            return 1;
        } else {
            return (now.sub(genesis)).div(86400);
        }
    }

    function getPoolROI(address token) public view returns (uint roi){
        address payable pool = getPool(token);
        uint _baseStart = SPool(pool).baseAmtStaked().mul(2);
        uint _baseEnd = SPool(pool).baseAmt().mul(2);
        uint _ROIS = (_baseEnd.mul(10000)).div(_baseStart);
        uint _tokenStart = SPool(pool).tokenAmtStaked().mul(2);
        uint _tokenEnd = SPool(pool).tokenAmt().mul(2);
        uint _ROIA = (_tokenEnd.mul(10000)).div(_tokenStart);
        return (_ROIS + _ROIA).div(2);
   }

   function getPoolAPY(address token) public view returns (uint apy){
        uint avgROI = getPoolROI(token);
        uint poolAge = getPoolAge(token);
        return (avgROI.mul(365)).div(poolAge);
   }

    function getMemberROI(address token, address member) public view returns (uint roi){
        MemberDataStruct memory memberData = getMemberData(token, member);
        uint _baseStart = memberData.baseAmtStaked.mul(2);
        if(isMember(token, member)){
            (uint _baseShare, uint _tokenShare) = getMemberShare(token, member);
            uint _baseEnd = _baseShare.mul(2);
            uint _ROIS = 0; uint _ROIA = 0;
            if(_baseStart > 0){
                _ROIS = (_baseEnd.mul(10000)).div(_baseStart);
            }
            uint _tokenStart = memberData.tokenAmtStaked.mul(2);
            uint _tokenEnd = _tokenShare.mul(2);
            if(_tokenStart > 0){
                _ROIA = (_tokenEnd.mul(10000)).div(_tokenStart);
            }
            return (_ROIS + _ROIA).div(2);
        } else {
            return 0;
        }
    }

    function isMember(address token, address member) public view returns(bool){
        address payable pool = getPool(token);
        if (iERC20(pool).balanceOf(member) > 0){
            return true;
        } else {
            return false;
        }
    }

   function calcValueInBase(address token, uint amount) public view returns (uint value){
       address payable pool = getPool(token);
       return SPool(pool).calcValueInBase(amount);
   }

    function calcValueInToken(address token, uint amount) public view returns (uint value){
        address payable pool = getPool(token);
        return SPool(pool).calcValueInToken(amount);
   }

   function calcTokenPPinBase(address token, uint amount) public view returns (uint _output){
       address payable pool = getPool(token);
        return  SPool(pool).calcTokenPPinBase(amount);
   }

    function calcBasePPinToken(address token, uint amount) public view returns (uint _output){
        address payable pool = getPool(token);
        return  SPool(pool).calcBasePPinToken(amount);
   }

}
