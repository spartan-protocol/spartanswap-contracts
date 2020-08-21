// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

// import "./SFactory.sol";

// ERC20 Interface
interface ERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
    function transfer(address, uint) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function approve(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
}

interface SPOOL {
    function stakeForMember(uint inputSpartan, uint inputAsset, address member) external payable returns (uint units);
}
interface SFactory {
    function getPoolAddress(address token) external view returns (address pool);
}
interface MATH {
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

contract SPool is ERC20 {
    using SafeMath for uint;

    address public SPARTA;
    address public TOKEN;
    address public factory;
    MATH public math;

    uint public one = 10**18;
    uint public SETHCAP = 10000 * one;
    uint public DAY = 86400;
    uint public DAYCAP = 30*DAY;

    // ERC-20 Parameters
    string _name; string _symbol;
    uint public decimals; uint public override totalSupply;
    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    PoolDataStruct public poolData;
    struct PoolDataStruct {
        uint genesis;
        uint baseAmt;
        uint tokenAmt;
        uint baseAmtStaked;
        uint tokenAmtStaked;
        uint fees;
        uint volume;
        uint txCount;
    }
    
    mapping(address => MemberDataStruct) public memberData;
    struct MemberDataStruct {
        uint baseAmt;
        uint tokenAmt;
    }
   
    event Staked(address member, uint inputAsset, uint inputSpartan, uint unitsIssued);
    event Unstaked(address member, uint outputAsset, uint outputSpartan, uint unitsClaimed);
    event Swapped(address tokenFrom, address tokenTo, uint inputAmount, uint transferAmount, uint outputAmount, uint fee, address recipient);

    constructor (address _baseAmt, address _token, address _math) public payable {
        //local
        SPARTA = _baseAmt;
        TOKEN = _token;
        factory = msg.sender;
        math = MATH(_math);

        if(_token == address(0)){
            _name = "SPool-S3-Ethereum";
            _symbol = "SLT-S3-ETH";
        } else {
            string memory tokenName = ERC20(_token).name();
            _name = string(abi.encodePacked("SPool-S1-", tokenName));
            string memory tokenSymbol = ERC20(_token).symbol();
            _symbol = string(abi.encodePacked("SLT-S1-", tokenSymbol));
        }

        decimals = 18;
        poolData.genesis = now;

        // testnet
        // SPARTA = 0x95D0C08e59bbC354eE2218Da9F82A04D7cdB6fDF;
        // math = MATH(0x476B05e742Bd0Eed4C7cba11A8dDA72BE592B549);

        // mainnet
        // SPARTA = 0x4Ba6dDd7b89ed838FEd25d208D4f644106E34279;
        // math = MATH(0xe5087d4B22194bEd83556edEDca846c91E550b5B);
    }

    // receive() external payable {
    //     sell(msg.value, address(0), SPARTA);
    // }

    function getThisAddress() public view returns(address pool){
        return SFactory(factory).getPoolAddress(TOKEN);
    }

    //========================================ERC20=========================================//
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
    // ERC20 Transfer function
    function transfer(address to, uint value) public override returns (bool success) {
        _transfer(msg.sender, to, value);
        return true;
    }
    // ERC20 Approve function
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    // ERC20 TransferFrom function
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

    function stake(uint inputSpartan, uint inputAsset) public payable returns (uint units) {
        units = stakeForMember(inputSpartan, inputAsset, msg.sender);
        return units;
    }

    function stakeForMember(uint inputSpartan, uint inputAsset, address member) public payable returns (uint units) {
        uint _actualInputAsset = _handleTransferIn(TOKEN, inputAsset);
        uint _actualInputSpartan = _handleTransferIn(SPARTA, inputSpartan);
        units = _stake(_actualInputSpartan, _actualInputAsset, member);
        return units;
    }

    function _stake(uint _baseAmt, uint _token, address _member) internal returns (uint _units) {
        uint _S = poolData.baseAmt.add(_baseAmt);
        uint _A = poolData.tokenAmt.add(_token);
        _units = math.calcStakeUnits(_token, _A, _baseAmt, _S);   
        _incrementPoolBalances(_baseAmt, _token);                                                  
        _addDataForMember(_member, _baseAmt, _token);
        _allowances[_member][address(this)] += _units;
        _mint(_member, _units);
        emit Staked(_member, _token, _baseAmt, _units);
        return _units;
    }

    //==================================================================================//
    // Unstaking functions

    // Unstake % for self
    function unstake(uint basisPoints) public returns (bool success) {
        require((basisPoints > 0 && basisPoints <= 10000), "Must be valid BasisPoints");
        uint _units = math.calcPart(basisPoints, balanceOf(msg.sender));
        unstakeExact(_units);
        return true;
    }

    // Unstake an exact qty of units
    function unstakeExact(uint units) public returns (bool success) {
        uint _outputSpartan = math.calcShare(units, totalSupply, poolData.baseAmt);
        uint _outputAsset = math.calcShare(units, totalSupply, poolData.tokenAmt);
        _handleUnstake(units, _outputSpartan, _outputAsset, msg.sender);
        return true;
    }

    // Unstake % Asymmetrically
    function unstakeAsymmetric(uint basisPoints, bool toSpartan) public returns (uint outputAmount){
        uint _units = math.calcPart(basisPoints, balanceOf(msg.sender));
        outputAmount = unstakeExactAsymmetric(_units, toSpartan);
        return outputAmount;
    }
    // Unstake Exact Asymmetrically
    function unstakeExactAsymmetric(uint units, bool toSpartan) public returns (uint outputAmount){
        require(units < totalSupply, "Must not be last staker");
        uint _outputSpartan; uint _outputAsset; 
        if(toSpartan){
            _outputSpartan = math.calcAsymmetricShare(units, totalSupply, poolData.baseAmt);
            _outputAsset = 0;
            outputAmount = _outputSpartan;
        } else {
            _outputSpartan = 0;
            _outputAsset = math.calcAsymmetricShare(units, totalSupply, poolData.tokenAmt);
            outputAmount = _outputAsset;
        }
        _handleUnstake(units, _outputSpartan, _outputAsset, msg.sender);
        return outputAmount;
    }

    // Internal - handle Unstake
    function _handleUnstake(uint _units, uint _outputSpartan, uint _outputAsset, address payable _member) internal {
        _decrementPoolBalances(_outputSpartan, _outputAsset);
        _removeDataForMember(_member, _units);
        _burn(_member, _units);
        emit Unstaked(_member, _outputAsset, _outputSpartan, _units);
        _handleTransferOut(TOKEN, _outputAsset, _member);
        _handleTransferOut(SPARTA, _outputSpartan, _member);
    } 

    //==================================================================================//
    // Upgrade functions

    // Upgrade from this contract to a new one - opt in
    function upgrade(address payable newContract) public {
        uint _units = balanceOf(msg.sender);
        uint _outputSpartan = math.calcShare(_units, totalSupply, poolData.baseAmt);
        uint _outputAsset = math.calcShare(_units, totalSupply, poolData.tokenAmt);
        _decrementPoolBalances(_outputSpartan, _outputAsset);
        _removeDataForMember(msg.sender, _units);
        emit Unstaked(msg.sender, _outputAsset, _outputSpartan, _units);
        ERC20(SPARTA).approve(newContract, _outputSpartan);
        if(TOKEN == address(0)){
            SPOOL(newContract).stakeForMember{value:_outputAsset}(_outputSpartan, _outputAsset, msg.sender);
        } else {
            ERC20(TOKEN).approve(newContract, _outputAsset);
            SPOOL(newContract).stakeForMember(_outputSpartan, _outputAsset, msg.sender);
        }
    }

    //==================================================================================//
    // Swapping functions

    function buy(uint amount) public payable returns (uint outputAmount, uint fee){
        (outputAmount, fee) = buyTo(amount, msg.sender);
        return (outputAmount, fee);
    }
    function buyTo(uint amount, address payable member) public payable returns (uint outputAmount, uint fee) {
        uint _actualAmount = _handleTransferIn(SPARTA, amount);
        (outputAmount, fee) = _swapSpartanToAsset(amount);
        emit Swapped(SPARTA, TOKEN, _actualAmount, 0, outputAmount, fee, member);
        _handleTransferOut(TOKEN, outputAmount, member);
        return (outputAmount, fee);
    }

    function sell(uint amount) public payable returns (uint outputAmount, uint fee){
        (outputAmount, fee) = sellTo(amount, msg.sender);
        return (outputAmount, fee);
    }
    function sellTo(uint amount, address payable member) public payable returns (uint outputAmount, uint fee) {
        uint _actualAmount = _handleTransferIn(TOKEN, amount);
        (outputAmount, fee) = _swapAssetToSpartan(amount);
        emit Swapped(TOKEN, SPARTA, _actualAmount, 0, outputAmount, fee, member);
        _handleTransferOut(SPARTA, outputAmount, member);
        return (outputAmount, fee);
    }

    function swap(uint inputAmount, address toAsset) public payable returns (uint outputAmount, uint fee) {
        (outputAmount, fee) = swapTo(inputAmount, toAsset, msg.sender);
        return (outputAmount, fee);
    }
    function swapTo(uint inputAmount, address toAsset, address payable member) public payable returns (uint outputAmount, uint fee) {
        require(toAsset != SPARTA, "Asset must not be SPARTA");
        address addrTo = SFactory(factory).getPoolAddress(toAsset); SPool toPool = SPool(addrTo);

        uint _actualAmount = _handleTransferIn(TOKEN, inputAmount);
        (uint _tfr, uint _feeTfr) = _swapAssetToSpartan(_actualAmount);
        emit Swapped(TOKEN, SPARTA, _actualAmount, 0, _tfr, _feeTfr, member);

        ERC20(SPARTA).approve(addrTo, _tfr);                                 // Approve pool to spend SPARTA
        (uint _out, uint _feeOut) = toPool.buyTo(_tfr, member);                 // Buy to token
        outputAmount = _out;
        fee = _feeOut + toPool.calcValueInAsset(_feeTfr);
        return (outputAmount, fee);
    }

    function _swapSpartanToAsset(uint _x) internal returns (uint _y, uint _fee){
        uint _X = poolData.baseAmt;
        uint _Y = poolData.tokenAmt;
        _y =  math.calcSwapOutput(_x, _X, _Y);
        _fee = math.calcSwapFee(_x, _X, _Y);
        poolData.baseAmt = poolData.baseAmt.add(_x);
        poolData.tokenAmt = poolData.tokenAmt.sub(_y);
        _updatePoolMetrics(_y+_fee, _fee, false);
        return (_y, _fee);
    }

    function _swapAssetToSpartan(uint _x) internal returns (uint _y, uint _fee){
        uint _X = poolData.tokenAmt;
        uint _Y = poolData.baseAmt;
        _y =  math.calcSwapOutput(_x, _X, _Y);
        _fee = math.calcSwapFee(_x, _X, _Y);
        poolData.tokenAmt = poolData.tokenAmt.add(_x);
        poolData.baseAmt = poolData.baseAmt.sub(_y);
        _updatePoolMetrics(_y+_fee, _fee, true);
        return (_y, _fee);
    }

    //==================================================================================//
    // Data Model

    function _incrementPoolBalances(uint _baseAmt, uint _token) internal {
        poolData.baseAmt = poolData.baseAmt.add(_baseAmt);
        poolData.tokenAmt = poolData.tokenAmt.add(_token); 
        poolData.baseAmtStaked = poolData.baseAmtStaked.add(_baseAmt);
        poolData.tokenAmtStaked = poolData.tokenAmtStaked.add(_token); 
    }

    function _decrementPoolBalances(uint _baseAmt, uint _token) internal {
        uint _unstakedSpartan = math.calcShare(_baseAmt, poolData.baseAmt, poolData.baseAmtStaked);
        uint _unstakedAsset = math.calcShare(_token, poolData.tokenAmt, poolData.tokenAmtStaked);
        poolData.baseAmtStaked = poolData.baseAmtStaked.sub(_unstakedSpartan);
        poolData.tokenAmtStaked = poolData.tokenAmtStaked.sub(_unstakedAsset); 
        poolData.baseAmt = poolData.baseAmt.sub(_baseAmt);
        poolData.tokenAmt = poolData.tokenAmt.sub(_token); 
    }

    function _addDataForMember(address _member, uint _baseAmt, uint _token) internal {
        memberData[_member].baseAmt = memberData[_member].baseAmt.add(_baseAmt);
        memberData[_member].tokenAmt = memberData[_member].tokenAmt.add(_token);
    }

    function _removeDataForMember(address _member, uint _units) internal{
        uint stakeUnits = balanceOf(_member);
        uint _baseAmt = math.calcShare(_units, stakeUnits, memberData[_member].baseAmt);
        uint _token = math.calcShare(_units, stakeUnits, memberData[_member].tokenAmt);
        memberData[_member].baseAmt = memberData[_member].baseAmt.sub(_baseAmt);
        memberData[_member].tokenAmt = memberData[_member].tokenAmt.sub(_token);
    }

    function _updatePoolMetrics(uint _tx, uint _fee, bool _toSpartan) internal {
        poolData.txCount += 1;
        uint _volume = poolData.volume;
        uint _fees = poolData.fees;
        if(_toSpartan){
            poolData.volume = _tx.add(_volume); 
            poolData.fees = _fee.add(_fees); 
        } else {
            uint _txSpartan = calcValueInSpartan(_tx);
            uint _feeSpartan = calcValueInSpartan(_fee);
            poolData.volume = _volume.add(_txSpartan); 
            poolData.fees = _fees.add(_feeSpartan); 
        }
    }

    //==================================================================================//
    // Asset Transfer Functions

    function _handleTransferIn(address _token, uint _amount) internal returns(uint actual){
        if(_amount > 0) {
            if(_token == address(0)){
                require((_amount == msg.value), "Must get Eth");
                actual = _amount;
            } else {
                uint startBal = ERC20(_token).balanceOf(address(this)); 
                ERC20(_token).transferFrom(msg.sender, address(this), _amount); 
                actual = ERC20(_token).balanceOf(address(this)).sub(startBal);
            }
        }
    }

    function _handleTransferOut(address _token, uint _amount, address payable _recipient) internal {
        if(_amount > 0) {
            if (_token == address(0)) {
                _recipient.call{value:_amount}(""); 
            } else {
                ERC20(_token).transfer(_recipient, _amount);
            }
        }
    }

    function sync() public {
        if (TOKEN == address(0)) {
            poolData.tokenAmt = address(this).balance;
        } else {
            poolData.tokenAmt = ERC20(TOKEN).balanceOf(address(this));
        }
    }

    //==================================================================================//
    // Helper functions

    function getStakerShare(address member) public view returns(uint stakerShare){
        return math.calcShare(balanceOf(member), totalSupply, 10000);
    }
    function getStakerShareSpartan(address member) public view returns(uint baseAmt){
        baseAmt = math.calcShare(balanceOf(member), totalSupply, poolData.baseAmt);
        return baseAmt;
    }
    function getStakerShareAsset(address member) public view returns(uint token){
        token = math.calcShare(balanceOf(member), totalSupply, poolData.tokenAmt);
        return token;
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
        uint _baseAmtStart = poolData.baseAmtStaked.mul(2);
        uint _baseAmtEnd = poolData.baseAmt.mul(2);
        uint _ROIS = (_baseAmtEnd.mul(10000)).div(_baseAmtStart);
        uint _tokenStart = poolData.tokenAmtStaked.mul(2);
        uint _tokenEnd = poolData.tokenAmt.mul(2);
        uint _ROIA = (_tokenEnd.mul(10000)).div(_tokenStart);
        return (_ROIS + _ROIA).div(2);
   }

   function getPoolAPY() public view returns (uint apy){
        uint avgROI = getPoolROI();
        uint poolAge = getPoolAge();
        return (avgROI.mul(365)).div(poolAge);
   }

    function getMemberROI(address member) public view returns (uint roi){
        uint _baseAmtStart = memberData[member].baseAmt.mul(2);
        if(isMember(member)){
            uint _baseAmtEnd = getStakerShareSpartan(member).mul(2);
            uint _ROIS = 0; uint _ROIA = 0;
            if(_baseAmtStart > 0){
                _ROIS = (_baseAmtEnd.mul(10000)).div(_baseAmtStart);
            }
            uint _tokenStart = memberData[member].tokenAmt.mul(2);
            uint _tokenEnd = getStakerShareAsset(member).mul(2);
            if(_tokenStart > 0){
                _ROIA = (_tokenEnd.mul(10000)).div(_tokenStart);
            }
            return (_ROIS + _ROIA).div(2);
        } else {
            return 0;
        }
        
   }

   function calcValueInSpartan(uint a) public view returns (uint value){
       uint _token = poolData.tokenAmt;
       uint _baseAmt = poolData.baseAmt;
       return (a.mul(_baseAmt)).div(_token);
   }

    function calcValueInAsset(uint v) public view returns (uint value){
       uint _token = poolData.tokenAmt;
       uint _baseAmt = poolData.baseAmt;
       return (v.mul(_token)).div(_baseAmt);
   }

   function calcAssetPPinSpartan(uint amount) public view returns (uint _output){
        uint _token = poolData.tokenAmt;
        uint _baseAmt = poolData.baseAmt;
        return  math.calcSwapOutput(amount, _token, _baseAmt);
   }

    function calcSpartanPPinAsset(uint amount) public view returns (uint _output){
        uint _token = poolData.tokenAmt;
        uint _baseAmt = poolData.baseAmt;
        return  math.calcSwapOutput(amount, _baseAmt, _token);
   }
}
