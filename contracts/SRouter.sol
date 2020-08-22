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
interface iSPARTA {
    function secondsPerEra() external view returns (uint);
}
interface iUTILS {
    function calcPart(uint bp, uint total) external pure returns (uint part);
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    function calcSwapOutput(uint x, uint X, uint Y) external pure returns (uint output);
    function calcSwapFee(uint x, uint X, uint Y) external pure returns (uint output);
    function calcStakeUnits(uint a, uint A, uint v, uint S) external pure returns (uint units);
    function calcAsymmetricShare(uint s, uint T, uint A) external pure returns (uint share);
    function getPoolAge(address token) external view returns(uint age);
    function getPoolShare(address token, uint units) external view returns(uint baseAmt, uint tokenAmt);
    function getPoolShareAssym(address token, uint units, bool toBase) external view returns(uint baseAmt, uint tokenAmt, uint outputAmt);
}
interface iSDAO {
    function ROUTER() external view returns(address);
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

contract SPool is iERC20 {
    using SafeMath for uint;

    address public SPARTA;
    iSDAO public SDAO;
    iUTILS public UTILS;
    address public TOKEN;
    // address public SDAO.ROUTER();

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
        require(msg.sender == SDAO.ROUTER(), "RouterErr");
        _;
    }

    constructor (address _sparta, iSDAO _sDao, iUTILS _utils, address _token) public payable {
        //local
        SPARTA = _sparta;
        SDAO = _sDao;
        TOKEN = _token;
        // SDAO.ROUTER() = msg.sender;
        UTILS = _utils;

        if(_token == address(0)){
            _name = "SpartanPoolV1-BinanceCoin";
            _symbol = "SPT1-BNB";
        } else {
            string memory tokenName = iERC20(_token).name();
            _name = string(abi.encodePacked("SpartanPoolV1-", tokenName));
            string memory tokenSymbol = iERC20(_token).symbol();
            _symbol = string(abi.encodePacked("SPT1-", tokenSymbol));
            iERC20(_token).approve(SDAO.ROUTER(), (2**256)-1);
        }

        decimals = 18;
        genesis = now;
        _allowances[address(this)][SDAO.ROUTER()] = (2**256)-1;
        iERC20(SPARTA).approve(SDAO.ROUTER(), (2**256)-1);
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
        require(value <= _allowances[from][msg.sender], 'AllowanceErr');
        _allowances[from][msg.sender] = _allowances[from][msg.sender].sub(value);
        _transfer(from, to, value);
        return true;
    }

    // Internal transfer function
    function _transfer(address _from, address _to, uint _value) private {
        require(_balances[_from] >= _value, 'BalanceErr');
        require(_balances[_to] + _value >= _balances[_to], 'BalanceErr');
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
        uint256 decreasedAllowance = allowance(account, msg.sender).sub(amount, "AllowanceErr");
        _approve(account, msg.sender, decreasedAllowance);
        _burn(account, amount);
    }
    function _burn(address account, uint256 amount) internal virtual {
        _balances[account] = _balances[account].sub(amount, "BalanceErr");
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
        _units = UTILS.calcStakeUnits(_tokenAmt, _A, _baseAmt, _S);  
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
        _y =  UTILS.calcSwapOutput(_x, _X, _Y);
        _fee = UTILS.calcSwapFee(_x, _X, _Y);
        baseAmt = baseAmt.add(_x);
        tokenAmt = tokenAmt.sub(_y);
        _updatePoolMetrics(_y+_fee, _fee, false);
        return (_y, _fee);
    }

    function _swapTokenToBase(uint _x) external onlyRouter returns (uint _y, uint _fee){
        uint _X = tokenAmt;
        uint _Y = baseAmt;
        _y =  UTILS.calcSwapOutput(_x, _X, _Y);
        _fee = UTILS.calcSwapFee(_x, _X, _Y);
        tokenAmt = tokenAmt.add(_x);
        baseAmt = baseAmt.sub(_y);
        _updatePoolMetrics(_y+_fee, _fee, true);
        return (_y, _fee);
    }

    //==================================================================================//
    // Dividend functions

    function add(address token, uint amount) public returns (bool success) {
        if(token == SPARTA){
            iERC20(SPARTA).transferFrom(msg.sender, address(this), amount);
            baseAmt = baseAmt.add(amount);
            return true;
        } else if (token == TOKEN){
            iERC20(TOKEN).transferFrom(msg.sender, address(this), amount);
            tokenAmt = tokenAmt.add(amount); 
            return true;
        } else {
            return false;
        }
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
        uint _unstakedBase = UTILS.calcShare(_baseAmt, baseAmt, baseAmtStaked);
        uint _unstakedToken = UTILS.calcShare(_tokenAmt, tokenAmt, tokenAmtStaked);
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
        uint _baseAmt = UTILS.calcShare(_units, stakeUnits, member_baseAmtStaked[_member]);
        uint _tokenAmt = UTILS.calcShare(_units, stakeUnits, member_tokenAmtStaked[_member]);
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

   function calcTokenPPinBase(uint amount) public view returns (uint output){
        return  UTILS.calcSwapOutput(amount, tokenAmt, baseAmt);
    }

    function calcBasePPinToken(uint amount) public view returns (uint output){
        return  UTILS.calcSwapOutput(amount, baseAmt, tokenAmt);
    }
}

contract SRouter {

    using SafeMath for uint;

    address public SPARTA;
    iSDAO public SDAO;
    iUTILS public UTILS;

    uint256 public currentEra;
    uint256 public nextEraTime;
    uint256 public reserve;

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
    event NewEra(uint256 currentEra, uint256 nextEraTime, uint256 reserve);

    constructor (address _sparta, iSDAO _sDao, iUTILS _utils) public payable {
        SPARTA = _sparta; //0x3E2e792587Ceb6c1090a8A42F3EFcFad818d266D;
        SDAO = _sDao;
        UTILS = _utils; //0x17218e58Fdf07c989faCca25De4c6FdB06502186;
    }

    function createPool(uint inputBase, uint inputToken, address token) public payable returns(address payable pool){
        require(getPool(token) == address(0), "CreateErr");
        require(token != SPARTA, "CreateErr");
        require((inputToken > 0 && inputBase > 0), "CreateErr");
        SPool newPool = new SPool(SPARTA, SDAO, UTILS, token);
        pool = payable(address(newPool));
        uint _actualInputToken = _handleTransferIn(token, inputToken, pool);
        uint _actualInputBase = _handleTransferIn(SPARTA, inputBase, pool);
        mapToken_Pool[token] = pool;
        arrayTokens.push(token);
        isPool[pool] = true;
        totalStaked += _actualInputBase;
        stakeTx += 1;
        SPool(pool)._handleStake(_actualInputBase, _actualInputToken, msg.sender);
        emit NewPool(token, pool, now);
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
        stakeTx += 1;
        return units;
    }

    //==================================================================================//
    // Unstaking functions

    // Unstake % for self
    function unstake(uint basisPoints, address token) public returns (bool success) {
        require((basisPoints > 0 && basisPoints <= 10000), "InputErr");
        uint _units = UTILS.calcPart(basisPoints, iERC20(getPool(token)).balanceOf(msg.sender));
        unstakeExact(_units, token);
        return true;
    }

    // Unstake an exact qty of units
    function unstakeExact(uint units, address token) public returns (bool success) {
        address payable pool = getPool(token);
        address payable member = msg.sender;
        (uint _outputBase, uint _outputToken) = UTILS.getPoolShare(token, units);
        SPool(pool)._handleUnstake(units, _outputBase, _outputToken, member);
        emit Unstaked(member, _outputBase, _outputToken, units);
        totalStaked = totalStaked.sub(_outputBase);
        unstakeTx += 1;
        _handleTransferOut(token, _outputToken, pool, member);
        _handleTransferOut(SPARTA, _outputBase, pool, member);
        return true;
    }

    // // Unstake % Asymmetrically
    function unstakeAsymmetric(uint basisPoints, bool toBase, address token) public returns (uint outputAmount){
        uint _units = UTILS.calcPart(basisPoints, iERC20(getPool(token)).balanceOf(msg.sender));
        outputAmount = unstakeExactAsymmetric(_units, toBase, token);
        return outputAmount;
    }
    // Unstake Exact Asymmetrically
    function unstakeExactAsymmetric(uint units, bool toBase, address token) public returns (uint outputAmount){
        address payable pool = getPool(token);
        require(units < iERC20(pool).totalSupply(), "InputErr");
        (uint _outputBase, uint _outputToken, uint _outputAmount) = UTILS.getPoolShareAssym(token, units, toBase);
        SPool(pool)._handleUnstake(units, _outputBase, _outputToken, msg.sender);
        emit Unstaked(msg.sender, _outputBase, _outputToken, units);
        totalStaked = totalStaked.sub(_outputBase);
        unstakeTx += 1;
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
        // addDividend(pool, outputAmount, fee);
        totalStaked += _actualAmount;
        totalVolume += _actualAmount;
        totalFees += SPool(pool).calcValueInBase(fee);
        swapTx += 1;
        _handleTransferOut(token, outputAmount, pool, member);
        emit Swapped(SPARTA, token, _actualAmount, 0, outputAmount, fee, member);
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
        // addDividend(pool, outputAmount, fee);
        totalStaked = totalStaked.sub(outputAmount);
        totalVolume += outputAmount;
        totalFees += fee;
        swapTx += 1;
        _handleTransferOut(SPARTA, outputAmount, pool, member);
        emit Swapped(token, SPARTA, _actualAmount, 0, outputAmount, fee, member);
        return (outputAmount, fee);
    }

    function swap(uint inputAmount, address fromToken, address toToken) public payable returns (uint outputAmount, uint fee) {
        require(fromToken != toToken, "InputErr");
        address payable poolFrom = getPool(fromToken); address payable poolTo = getPool(toToken);
        uint _actualAmount = _handleTransferIn(fromToken, inputAmount, poolFrom);
        uint _transferAmount = 0;
        if(fromToken == SPARTA){
            (outputAmount, fee) = SPool(poolFrom)._swapBaseToToken(_actualAmount);      // Buy to token
            totalStaked += _actualAmount;
            totalVolume += _actualAmount;
            // addDividend(poolFrom, outputAmount, fee);
        } else if(toToken == SPARTA) {
            (outputAmount, fee) = SPool(poolFrom)._swapTokenToBase(_actualAmount);   // Sell to token
            totalStaked = totalStaked.sub(outputAmount);
            totalVolume += outputAmount;
            // addDividend(poolFrom, outputAmount, fee);
        } else {
            (uint _yy, uint _feey) = SPool(poolFrom)._swapTokenToBase(_actualAmount);             // Sell to SPARTA
            totalVolume += _yy; totalFees += _feey;
            // addDividend(poolFrom, _yy, _feey);
            iERC20(SPARTA).transferFrom(poolFrom, poolTo, _yy); 
            (uint _zz, uint _feez) = SPool(poolTo)._swapBaseToToken(_yy);              // Buy to token
            totalFees += SPool(poolTo).calcValueInBase(_feez);
            // addDividend(poolTo, _zz, _feez);
            _transferAmount = _yy; outputAmount = _zz; 
            fee = _feez + SPool(poolTo).calcValueInToken(_feey);
        }
        swapTx += 1;
        _handleTransferOut(toToken, outputAmount, poolTo, msg.sender);
        emit Swapped(fromToken, toToken, _actualAmount, _transferAmount, outputAmount, fee, msg.sender);
        return (outputAmount, fee);
    }


    //==================================================================================//
    // Revenue Functions

    // Every swap after every Era, updates the balance
    // Every swap takes 1000th of the reserve, adds it baseAmt balance
    // Every swap charges 30 BP from swapper, burns it

    // function _checkEmission() private {
    //     if (now >= nextEraTime) {                                                           // If new Era and allowed to emit
    //         currentEra += 1;                                                               // Increment Era
    //         nextEraTime = now + iSPARTA(SPARTA).secondsPerEra() + 100;                     // Set next Era time
    //         syncReserve();
    //         emit NewEra(currentEra, nextEraTime, reserve);                               // Emit Event
    //     }
    // }

    // function syncReserves() public {
    //     reserve = iERC20(SPARTA).balanceOf(address(this));
    //     // burn income
    // }

    // function payDividends(address token) public {
    //     uint dividend = getDividend(token);
    //     reserve = reserve.sub(dividend);
    //     SPool(pool).add(SPARTA, dividend);
    // }

    // function getSwapShare(uint amount, uint fee) public view returns(uint share) {
    //     uint dayCount = UTILS.getPoolAge(address(0));
    //     uint txPerDay = swapTx.div(dayCount); // Average tx per day, eg 200
    //     uint txShare = reserve.div(txPerDay); // txShare is reserve / 200 
    //     return txShare.mul(fee).div(amount); // 10% slip -> 10% of txShare
    // }

    // function addDividend(address payable pool, uint outputAmount, uint fee) private {
    //     uint dividend = getSwapShare(outputAmount, fee);
    //     reserve = reserve.sub(dividend);
    //     SPool(pool).add(SPARTA, dividend);
    // }

    //==================================================================================//
    // Token Transfer Functions

    function _handleTransferIn(address _token, uint _amount, address _pool) internal returns(uint actual){
        if(_amount > 0) {
            if(_token == address(0)){
                require((_amount == msg.value), "InputErr");
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


    //==================================================================================//
    // Upgrade functions

    // // Upgrade from this contract to a new one - opt in
    // function upgrade(address payable newContract, address token) public {
    //     address payable pool = getPool(token);
    //     address payable member = msg.sender;
    //     uint _units = iERC20(getPool(token)).balanceOf(member);
    //     (uint _outputBase, uint _outputToken) = SPool(pool).getMemberShare(member, _units);
    //     SPool(pool)._handleUnstake(_units, _outputBase, _outputToken, member);
    //     emit Unstaked(member, _outputBase, _outputToken, _units);
    //     iERC20(SPARTA).transferFrom(pool, address(this), _outputBase); 
    //     iERC20(SPARTA).approve(newContract, _outputBase);
    //     if(token == address(0)){
    //         iSSDAO.ROUTER()(newContract).stakeForMember{value:_outputToken}(_outputBase, _outputToken, token, member);
    //     } else {
    //         iERC20(token).approve(newContract, _outputToken);
    //         iSSDAO.ROUTER()(newContract).stakeForMember(_outputBase, _outputToken, token, member);
    //     }
    // }