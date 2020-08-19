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

interface iSPOOL {
    function transferEth(address payable to, uint value) external returns (bool success);
}
interface iSROUTER {
    function stakeForMember(uint inputSparta, uint inputToken, address token, address member) external payable returns (uint units);
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

    PoolDataStruct public poolData;
    struct PoolDataStruct {
        uint genesis;
        uint sparta;
        uint token;
        uint spartaStaked;
        uint tokenStaked;
        uint fees;
        uint volume;
        uint txCount;
    }
    
    mapping(address => MemberDataStruct) public memberData;
    struct MemberDataStruct {
        uint sparta;
        uint token;
    }
   
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
            _symbol = "SPARTA1-BNB";
        } else {
            string memory tokenName = iERC20(_token).name();
            _name = string(abi.encodePacked("SpartanPoolV1-", tokenName));
            string memory tokenSymbol = iERC20(_token).symbol();
            _symbol = string(abi.encodePacked("SPARTA1-", tokenSymbol));
            iERC20(_token).approve(router, (2**256)-1);
        }

        decimals = 18;
        poolData.genesis = now;
        _allowances[address(this)][router] = (2**256)-1;
        iERC20(SPARTA).approve(router, (2**256)-1);
        
        // testnet
        // SPARTA = 0x95D0C08e59bbC354eE2218Da9F82A04D7cdB6fDF;
        // math = iMATH(0x476B05e742Bd0Eed4C7cba11A8dDA72BE592B549);

        // mainnet
        // SPARTA = 0x4Ba6dDd7b89ed838FEd25d208D4f644106E34279;
        // math = iMATH(0xe5087d4B22194bEd83556edEDca846c91E550b5B);
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

    // Internal transfer function which includes the Fee
    function _transfer(address _from, address _to, uint _value) private {
        require(_balances[_from] >= _value, 'Must not send more than balance');
        require(_balances[_to] + _value >= _balances[_to], 'Balance overflow');
        _balances[_from] =_balances[_from].sub(_value);
        _balances[_to] += _value;                                               // Add to receiver
        emit Transfer(_from, _to, _value);                                      // Transfer event
    }

    // Internal mint (upgrading and daily emissions)
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

    function _handleStake(uint _sparta, uint _token, address _member) external onlyRouter returns (uint _units) {
        uint _S = poolData.sparta.add(_sparta);
        uint _A = poolData.token.add(_token);
        _incrementPoolBalances(_sparta, _token);                                                  
        _addDataForMember(_member, _sparta, _token);
        _units = math.calcStakeUnits(_token, _A, _sparta, _S);  
        // _allowances[_member][address(this)] += _units;
        _mint(_member, _units);
        return _units;
    }

    //==================================================================================//
    // Unstaking functions

    // Internal - handle Assym Unstake
    function _handleAssymUnstake(uint _units, bool _toSparta, address _member) public onlyRouter returns (bool success) {
        require(_units < totalSupply, "Must not be last staker");
        (uint _outputSparta, uint _outputToken, uint _outputAmount) = getMemberShareAssym(_member, _units, _toSparta); 
        _handleUnstake(_units, _outputSparta, _outputToken, _member);
        return true;
    } 

    // Internal - handle Unstake
    function _handleUnstake(uint _units, uint _outputSparta, uint _outputToken, address _member) public onlyRouter returns (bool success) {
        _decrementPoolBalances(_outputSparta, _outputToken);
        _removeDataForMember(_member, _units);
        _burn(_member, _units);
        return true;
    } 

    //==================================================================================//
    // Swapping functions

    function _swapSpartaToToken(uint _x) external onlyRouter returns (uint _y, uint _fee){
        uint _X = poolData.sparta;
        uint _Y = poolData.token;
        _y =  math.calcSwapOutput(_x, _X, _Y);
        _fee = math.calcSwapFee(_x, _X, _Y);
        poolData.sparta = poolData.sparta.add(_x);
        poolData.token = poolData.token.sub(_y);
        _updatePoolMetrics(_y+_fee, _fee, false);
        return (_y, _fee);
    }

    function _swapTokenToSparta(uint _x) external onlyRouter returns (uint _y, uint _fee){
        uint _X = poolData.token;
        uint _Y = poolData.sparta;
        _y =  math.calcSwapOutput(_x, _X, _Y);
        _fee = math.calcSwapFee(_x, _X, _Y);
        poolData.token = poolData.token.add(_x);
        poolData.sparta = poolData.sparta.sub(_y);
        _updatePoolMetrics(_y+_fee, _fee, true);
        return (_y, _fee);
    }

    //==================================================================================//
    // Data Model

    function _incrementPoolBalances(uint _sparta, uint _token) internal {
        poolData.sparta = poolData.sparta.add(_sparta);
        poolData.token = poolData.token.add(_token); 
        poolData.spartaStaked = poolData.spartaStaked.add(_sparta);
        poolData.tokenStaked = poolData.tokenStaked.add(_token); 
    }

    function _decrementPoolBalances(uint _sparta, uint _token) internal {
        uint _unstakedSparta = math.calcShare(_sparta, poolData.sparta, poolData.spartaStaked);
        uint _unstakedToken = math.calcShare(_token, poolData.token, poolData.tokenStaked);
        poolData.spartaStaked = poolData.spartaStaked.sub(_unstakedSparta);
        poolData.tokenStaked = poolData.tokenStaked.sub(_unstakedToken); 
        poolData.sparta = poolData.sparta.sub(_sparta);
        poolData.token = poolData.token.sub(_token); 
    }

    function _addDataForMember(address _member, uint _sparta, uint _token) internal {
        memberData[_member].sparta = memberData[_member].sparta.add(_sparta);
        memberData[_member].token = memberData[_member].token.add(_token);
    }

    function _removeDataForMember(address _member, uint _units) internal{
        uint stakeUnits = balanceOf(_member);
        uint _sparta = math.calcShare(_units, stakeUnits, memberData[_member].sparta);
        uint _token = math.calcShare(_units, stakeUnits, memberData[_member].token);
        memberData[_member].sparta = memberData[_member].sparta.sub(_sparta);
        memberData[_member].token = memberData[_member].token.sub(_token);
    }

    function _updatePoolMetrics(uint _tx, uint _fee, bool _toSparta) internal {
        poolData.txCount += 1;
        uint _volume = poolData.volume;
        uint _fees = poolData.fees;
        if(_toSparta){
            poolData.volume = _tx.add(_volume); 
            poolData.fees = _fee.add(_fees); 
        } else {
            uint _txSparta = calcValueInSparta(_tx);
            uint _feeSparta = calcValueInSparta(_fee);
            poolData.volume = _volume.add(_txSparta); 
            poolData.fees = _fees.add(_feeSparta); 
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
            poolData.token = address(this).balance;
        } else {
            poolData.token = iERC20(TOKEN).balanceOf(address(this));
        }
    }

    //==================================================================================//
    // Helper functions

    function getStakerShare(address member) public view returns(uint stakerShare){
        return math.calcShare(balanceOf(member), totalSupply, 10000);
    }
    function getStakerShareSparta(address member) public view returns(uint sparta){
        sparta = math.calcShare(balanceOf(member), totalSupply, poolData.sparta);
        return sparta;
    }
    function getStakerShareToken(address member) public view returns(uint token){
        token = math.calcShare(balanceOf(member), totalSupply, poolData.token);
        return token;
    }

    function getMemberShare(address member, uint units) public view returns(uint sparta, uint token){
        sparta = math.calcShare(units, totalSupply, poolData.sparta);
        token = math.calcShare(units, totalSupply, poolData.token);
        return (sparta, token);
    }

    function getMemberShareAssym(address member, uint units, bool toSparta) public view returns(uint sparta, uint token, uint output){
        if(toSparta){
            sparta = math.calcAsymmetricShare(units, totalSupply, poolData.sparta);
            token = 0;
            output = sparta;
        } else {
            sparta = 0;
            token = math.calcAsymmetricShare(units, totalSupply, poolData.token);
            output = token;
        }
        return (sparta, token, output);
    }

    function getMemberData(address member) public view returns(MemberDataStruct memory){
        return(memberData[member]);
    }

    function isMember(address member) public view returns(bool){
        if (balanceOf(member) > 0){
            return true;
        } else {
            return false;
        }
    }

    function getPoolAge() public view returns (uint daysSinceGenesis){
        if(now < (poolData.genesis).add(86400)){
            return 1;
        } else {
            return (now.sub(poolData.genesis)).div(86400);
        }
    }

    function getPoolROI() public view returns (uint roi){
        uint _spartaStart = poolData.spartaStaked.mul(2);
        uint _spartaEnd = poolData.sparta.mul(2);
        uint _ROIS = (_spartaEnd.mul(10000)).div(_spartaStart);
        uint _tokenStart = poolData.tokenStaked.mul(2);
        uint _tokenEnd = poolData.token.mul(2);
        uint _ROIA = (_tokenEnd.mul(10000)).div(_tokenStart);
        return (_ROIS + _ROIA).div(2);
   }

   function getPoolAPY() public view returns (uint apy){
        uint avgROI = getPoolROI();
        uint poolAge = getPoolAge();
        return (avgROI.mul(365)).div(poolAge);
   }

    function getMemberROI(address member) public view returns (uint roi){
        uint _spartaStart = memberData[member].sparta.mul(2);
        if(isMember(member)){
            uint _spartaEnd = getStakerShareSparta(member).mul(2);
            uint _ROIS = 0; uint _ROIA = 0;
            if(_spartaStart > 0){
                _ROIS = (_spartaEnd.mul(10000)).div(_spartaStart);
            }
            uint _tokenStart = memberData[member].token.mul(2);
            uint _tokenEnd = getStakerShareToken(member).mul(2);
            if(_tokenStart > 0){
                _ROIA = (_tokenEnd.mul(10000)).div(_tokenStart);
            }
            return (_ROIS + _ROIA).div(2);
        } else {
            return 0;
        }
        
   }

   function calcValueInSparta(uint a) public view returns (uint value){
       uint _token = poolData.token;
       uint _sparta = poolData.sparta;
       return (a.mul(_sparta)).div(_token);
   }

    function calcValueInToken(uint v) public view returns (uint value){
       uint _token = poolData.token;
       uint _sparta = poolData.sparta;
       return (v.mul(_token)).div(_sparta);
   }

   function calcTokenPPinSparta(uint amount) public view returns (uint _output){
        uint _token = poolData.token;
        uint _sparta = poolData.sparta;
        return  math.calcSwapOutput(amount, _token, _sparta);
   }

    function calcSpartaPPinToken(uint amount) public view returns (uint _output){
        uint _token = poolData.token;
        uint _sparta = poolData.sparta;
        return  math.calcSwapOutput(amount, _sparta, _token);
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

    address[] arrayPools;
    mapping(address=>address payable) private mapToken_Pool;

    event Staked(address member, uint inputSparta, uint inputToken, uint unitsIssued);
    event Unstaked(address member, uint outputSparta, uint outputToken, uint unitsClaimed);
    event Swapped(address tokenFrom, address tokenTo, uint inputAmount, uint transferAmount, uint outputAmount, uint fee, address recipient);


    constructor (address _sparta, address _math) public payable {
        SPARTA = _sparta; //0x3E2e792587Ceb6c1090a8A42F3EFcFad818d266D;
        math = iMATH(_math); //0x17218e58Fdf07c989faCca25De4c6FdB06502186;
    }

    function createPool(uint inputSparta, uint inputToken, address token) public payable returns(address payable pool){
        require(token != SPARTA, "Token must not be Sparta");
        require((inputToken > 0 && inputSparta > 0), "Must get both tokens for new pool");
        SPool newPool = new SPool(SPARTA, token, math);
        // address newPoolAddr = address(newPool);
        pool = payable(address(newPool));
        mapToken_Pool[token] = pool;
        uint _actualInputToken = _handleTransferIn(token, inputToken, pool);
        uint _actualInputSparta = _handleTransferIn(SPARTA, inputSparta, pool);
        SPool(pool)._handleStake(_actualInputSparta, _actualInputToken, msg.sender);
        return pool;
    }

    function getPool(address token) public view returns(address payable pool){
        return mapToken_Pool[token];
    }

    //==================================================================================//
    // Staking functions

    function stake(uint inputSparta, uint inputToken, address token) public payable returns (uint units) {
        units = stakeForMember(inputSparta, inputToken, token, msg.sender);
        return units;
    }

    function stakeForMember(uint inputSparta, uint inputToken, address token, address member) public payable returns (uint units) {
        address payable pool = getPool(token);
        uint _actualInputToken = _handleTransferIn(token, inputToken, pool);
        uint _actualInputSparta = _handleTransferIn(SPARTA, inputSparta, pool);
        units = SPool(pool)._handleStake(_actualInputSparta, _actualInputToken, member);
        emit Staked(member, _actualInputSparta, _actualInputToken, units);
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
        (uint _outputSparta, uint _outputToken) = SPool(pool).getMemberShare(member, units);
        SPool(pool)._handleUnstake(units, _outputSparta, _outputToken, member);
        emit Unstaked(member, _outputSparta, _outputToken, units);
        _handleTransferOut(token, _outputToken, pool, member);
        _handleTransferOut(SPARTA, _outputSparta, pool, member);
        return true;
    }

    // // Unstake % Asymmetrically
    function unstakeAsymmetric(uint basisPoints, bool toSparta, address token) public returns (uint outputAmount){
        uint _units = math.calcPart(basisPoints, iERC20(getPool(token)).balanceOf(msg.sender));
        outputAmount = unstakeExactAsymmetric(_units, toSparta, token);
        return outputAmount;
    }
    // Unstake Exact Asymmetrically
    function unstakeExactAsymmetric(uint units, bool toSparta, address token) public returns (uint outputAmount){
        address payable pool = getPool(token);
        (uint _outputSparta, uint _outputToken, uint _outputAmount) = SPool(pool).getMemberShareAssym(msg.sender, units, toSparta);
        SPool(pool)._handleAssymUnstake(units, toSparta, msg.sender);
        emit Unstaked(msg.sender, _outputSparta, _outputToken, units);
        _handleTransferOut(token, _outputToken, pool, msg.sender);
        _handleTransferOut(SPARTA, _outputSparta, pool, msg.sender);
        return _outputAmount;
    }

    //==================================================================================//
    // Upgrade functions

    // // Upgrade from this contract to a new one - opt in
    // function upgrade(address payable newContract, address token) public {
    //     address payable pool = getPool(token);
    //     address payable member = msg.sender;
    //     uint _units = iERC20(getPool(token)).balanceOf(member);
    //     (uint _outputSparta, uint _outputToken) = SPool(pool).getMemberShare(member, _units);
    //     SPool(pool)._handleUnstake(_units, _outputSparta, _outputToken, member);
    //     emit Unstaked(member, _outputSparta, _outputToken, _units);
    //     iERC20(SPARTA).transferFrom(pool, address(this), _outputSparta); 
    //     iERC20(SPARTA).approve(newContract, _outputSparta);
    //     if(token == address(0)){
    //         iSROUTER(newContract).stakeForMember{value:_outputToken}(_outputSparta, _outputToken, token, member);
    //     } else {
    //         iERC20(token).approve(newContract, _outputToken);
    //         iSROUTER(newContract).stakeForMember(_outputSparta, _outputToken, token, member);
    //     }
    // }

    //==================================================================================//
    // Universal Swapping Functions

    function buy(uint amount, address token) public payable returns (uint outputAmount, uint fee){
        (outputAmount, fee) = buyTo(amount, token, msg.sender);
        return (outputAmount, fee);
    }
    function buyTo(uint amount, address token, address payable member) public payable returns (uint outputAmount, uint fee) {
        address payable pool = getPool(token);
        uint _actualAmount = _handleTransferIn(SPARTA, amount, pool);
        (outputAmount, fee) = SPool(pool)._swapSpartaToToken(amount);
        emit Swapped(SPARTA, token, _actualAmount, 0, outputAmount, fee, member);
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
        (outputAmount, fee) = SPool(pool)._swapTokenToSparta(amount);
        emit Swapped(token, SPARTA, _actualAmount, 0, outputAmount, fee, member);
        _handleTransferOut(SPARTA, outputAmount, pool, member);
        return (outputAmount, fee);
    }

    function swap(uint inputAmount, address fromToken, address toToken) public payable returns (uint outputAmount, uint fee) {
        require(fromToken != toToken, "Token must not be the same");
        address payable poolFrom = getPool(fromToken); address payable poolTo = getPool(toToken);
        uint _actualAmount = _handleTransferIn(fromToken, inputAmount, poolFrom);
        uint _transferAmount = 0;
        if(fromToken == SPARTA){
            (outputAmount, fee) = SPool(poolFrom)._swapSpartaToToken(_actualAmount);      // Buy to token
        } else if(toToken == SPARTA) {
            (outputAmount, fee) = SPool(poolFrom)._swapTokenToSparta(_actualAmount);   // Sell to token
        } else {
            (uint _yy, uint _feey) = SPool(poolFrom)._swapTokenToSparta(_actualAmount);             // Sell to SPARTA
            iERC20(SPARTA).transferFrom(poolFrom, poolTo, _yy); 
            (uint _zz, uint _feez) = SPool(poolTo)._swapSpartaToToken(_yy);              // Buy to token
            _transferAmount = _yy; outputAmount = _zz; 
            fee = _feez + SPool(poolTo).calcValueInToken(_feey);
        }
        emit Swapped(fromToken, toToken, _actualAmount, _transferAmount, outputAmount, fee, msg.sender);
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
        tokenDetails.name = iERC20(token).name();
        tokenDetails.symbol = iERC20(token).symbol();
        tokenDetails.decimals = iERC20(token).decimals();
        tokenDetails.totalSupply = iERC20(token).totalSupply();
        return tokenDetails;
    }

}