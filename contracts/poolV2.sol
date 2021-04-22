pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
// import "@nomiclabs/buidler/console.sol";
import "./iBEP20.sol";
interface iDAO {
    function ROUTER() external view returns(address);
    function UTILS() external view returns(address);
    function LEND() external view returns(address);
    function SYNTHROUTER() external view returns(address);
    function MSTATUS() external view returns(bool);
    function DAO() external view returns (address);
    function POOLFACTORY() external view returns(address);
    function RESERVE() external returns(address);
    function SYNTHFACTORY() external view returns(address);
}
interface iNDAO {
    function DAO() external view returns (iDAO);
 
}
interface iWBNB {
    function withdraw(uint256) external;
}
interface iBASE {
    function DAO() external view returns (iDAO);
    function transferTo(address, uint256 ) external payable returns(bool);
}
interface iUTILS {
    function calcAsymmetricValueBase(address pool, uint amount) external pure returns (uint units);
    function calcAsymmetricValueToken(address pool, uint amount) external pure returns (uint units);
    function calcLiquidityUnits(uint b, uint B, uint t, uint T, uint P) external pure returns (uint units);
    function calcLiquidityHoldings(uint units, address token, address pool) external pure returns (uint share);
    function calcSwapOutput(uint x, uint X, uint Y) external pure returns (uint output);
    function calcSwapFee(uint x, uint X, uint Y) external pure returns (uint output);
    function calcSpotValueInBaseWithPool(address pool, uint amount) external view returns (uint value);
    function calcPart(uint bp, uint total) external pure returns (uint part);
    function calcSwapValueInBase(address token, uint amount) external view returns (uint value);
    function calcSpotValueInBase(address token, uint amount) external view returns (uint value);
    function calcSpotValueInToken(address token, uint amount) external view returns (uint value);
    function getDepth(address pool) external view returns (uint depth);
    function calcLiquidityUnitsAsym(uint Amount, address pool)external pure returns (uint units);
}
interface iSYNTHROUTER {
    function getSynth(address) external view returns(address);
    function isSynth(address) external view returns(bool);
}
interface iSYNTH {
    function LayerONE() external view returns(address);
    function mintSynth(address) external returns (uint);
    function burnSynth() external returns(uint);
    function transferTo(address, uint256 ) external returns(bool);
}
interface iSYNTHFACTORY {
    function isSynth(address) external view returns (bool);

}


contract Pool is iBEP20 {

    address public BASE;
    address public NDAO;
    address public TOKEN;
    address public DEPLOYER;
    // ERC-20 Parameters
    string _name; string _symbol;
    uint256 public override decimals; uint256 public override totalSupply;
    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    uint256 public baseAmount;
    uint256 public tokenAmount;
    uint private lastMonth;
    uint public genesis;
    uint256 public map30DPoolRevenue;
    uint256 public mapPast30DPoolRevenue;
    uint256 [] public revenueArray;
    event AddLiquidity(address indexed member, uint inputBase, uint inputToken, uint unitsIssued);
    event RemoveLiquidity(address indexed member, uint outputBase, uint outputToken, uint unitsClaimed);
    event Swapped(address indexed tokenFrom, address indexed tokenTo,address indexed recipient, uint inputAmount, uint outputAmount, uint fee);

    function _DAO() internal view returns(iDAO) {
        bool status = iDAO(NDAO).MSTATUS();
        if(status == true){
         return iBASE(BASE).DAO();
        }else{
          return iNDAO(NDAO).DAO();
        }
    }
    modifier onlyDAO() {
        require(msg.sender == DEPLOYER, "!DAO");
        _;
    }
    modifier onlyRouter() {
        require(msg.sender == _DAO().ROUTER(), "!ROUTER");
        _;
    }

    constructor (address _base, address _token, address _newDAO) public payable {
        BASE = _base;
         NDAO = _newDAO;
        TOKEN = _token;
        string memory poolName = "-SpartanProtocolPool";
        string memory poolSymbol = "-SPP";
        _name = string(abi.encodePacked(iBEP20(_token).name(),poolName));
        _symbol = string(abi.encodePacked(iBEP20(_token).symbol(), poolSymbol));
        decimals = 18;
        genesis = block.timestamp;
        DEPLOYER = msg.sender;
        lastMonth = 0;
    }
    function changeNDAO(address newDAO) public onlyDAO {
        NDAO = newDAO;
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
        _allowances[from][msg.sender] -= value;
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
        totalSupply += amount;
        _balances[account] += amount;
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
        _balances[account] -= amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

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
        liquidityUnits = iUTILS(_DAO().UTILS()).calcLiquidityUnits(_actualInputBase, baseAmount, _actualInputToken, tokenAmount, totalSupply);
        _incrementPoolBalances(_actualInputBase, _actualInputToken);
        _mint(member, liquidityUnits); 
        sync();
        emit AddLiquidity(member, _actualInputBase, _actualInputToken, liquidityUnits);
        return liquidityUnits;
    }
    
    // Remove Liquidity
    function removeLiquidity() public returns (uint outputBase, uint outputToken) {
        return removeLiquidityForMember(msg.sender);
    } 

    // Remove Liquidity for a member
    function removeLiquidityForMember(address member) public returns (uint outputBase, uint outputToken) {
        uint256 _actualInputUnits = balanceOf(address(this));
        outputBase = iUTILS(_DAO().UTILS()).calcLiquidityHoldings(_actualInputUnits, BASE, address(this));
        outputToken = iUTILS(_DAO().UTILS()).calcLiquidityHoldings(_actualInputUnits, TOKEN, address(this));
        _decrementPoolBalances(outputBase, outputToken);
        _burn(address(this), _actualInputUnits);
        iBEP20(BASE).transfer(member, outputBase); 
        iBEP20(TOKEN).transfer(member, outputToken);
        sync();
        emit RemoveLiquidity(member, outputBase, outputToken, _actualInputUnits);
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
        emit Swapped(_fromToken, token,member, _amount, outputAmount, fee);
        iBEP20(token).transfer(member, outputAmount);
        sync();
        return (outputAmount, fee);
    }

    function mintSynths(address synthOut, address member) external returns(uint outputAmount, uint fee) {
      require(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(synthOut) == true, "!synth");
      uint256 _actualInputBase = _getAddedBaseAmount();
      uint _liquidityUnits = iUTILS(_DAO().UTILS()).calcLiquidityUnitsAsym(_actualInputBase, address(this)); 
      _incrementPoolBalances(_actualInputBase, 0);
      uint _fee = iUTILS(_DAO().UTILS()).calcSwapFee(_actualInputBase, baseAmount, tokenAmount);
      fee = iUTILS(_DAO().UTILS()).calcSpotValueInBase(TOKEN,_fee );
      _mint(synthOut, _liquidityUnits); 
      outputAmount = iSYNTH(synthOut).mintSynth(member); //mintSynth to Router
      _addPoolMetrics(fee);
      sync();
      return (outputAmount, fee);
    }

    function burnSynths(address synthIN, address member) external returns(uint outputAmount, uint fee) {
    require(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(synthIN) == true, "!synth");
      uint _inputSynth = iBEP20(synthIN).balanceOf(address(this));
      uint _baseOutput = iUTILS(_DAO().UTILS()).calcSwapValueInBase(TOKEN, _inputSynth);//get swapValue from synths input
      fee = iUTILS(_DAO().UTILS()).calcSwapFee(_inputSynth, tokenAmount, baseAmount);
      iBEP20(synthIN).transfer(synthIN, _inputSynth);
      iSYNTH(synthIN).burnSynth(); //redeem Synth
      _decrementPoolBalances(_baseOutput, 0);
      iBEP20(BASE).transfer(member, _baseOutput);
      _addPoolMetrics(fee);
      sync();
      return (_baseOutput, fee);
    }

    function _getAddedBaseAmount() internal view returns(uint256 _actual){
        uint _baseBalance = iBEP20(BASE).balanceOf(address(this)); 
        if(_baseBalance > baseAmount){
            _actual = _baseBalance-(baseAmount);
        } else {
            _actual = 0;
        }
        return _actual;
    }
  
    function _getAddedTokenAmount() internal view returns(uint256 _actual){
        uint _tokenBalance = iBEP20(TOKEN).balanceOf(address(this)); 
        if(_tokenBalance > tokenAmount){
            _actual = _tokenBalance-(tokenAmount);
        } else {
            _actual = 0;
        }
        return _actual;
    }

    function _swapBaseToToken(uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = baseAmount;
        uint256 _Y = tokenAmount;
        _y =  iUTILS(_DAO().UTILS()).calcSwapOutput(_x, _X, _Y);
        uint fee = iUTILS(_DAO().UTILS()).calcSwapFee(_x, _X, _Y);
        _fee = iUTILS(_DAO().UTILS()).calcSpotValueInBase(TOKEN, fee);
        _setPoolAmounts(_X+(_x), _Y-(_y));
        _addPoolMetrics(_fee);
        return (_y, _fee);
    }

    function _swapTokenToBase(uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = tokenAmount;
        uint256 _Y = baseAmount;
        _y =  iUTILS(_DAO().UTILS()).calcSwapOutput(_x, _X, _Y);
        _fee = iUTILS(_DAO().UTILS()).calcSwapFee(_x, _X, _Y);
        _setPoolAmounts(_Y-(_y), _X+(_x));
        _addPoolMetrics(_fee);
        return (_y, _fee);
    }

    // Increment internal balances
    function _incrementPoolBalances(uint _baseAmount, uint _tokenAmount) internal  {
        baseAmount += _baseAmount;
        tokenAmount += _tokenAmount;
    }
    function _setPoolAmounts(uint256 _baseAmount, uint256 _tokenAmount) internal  {
        baseAmount = _baseAmount;
        tokenAmount = _tokenAmount; 
    }
    // Decrement internal balances
    function _decrementPoolBalances(uint _baseAmount, uint _tokenAmount) internal  {
        baseAmount -= _baseAmount;
        tokenAmount -= _tokenAmount; 
    }

    function _addPoolMetrics(uint256 _fee) internal {
        if(lastMonth == 0){
            lastMonth = genesis;
        }
        if(block.timestamp <= lastMonth+(2592000)){//30Days
            map30DPoolRevenue = map30DPoolRevenue+(_fee);
        }else{
            lastMonth = lastMonth+(2592000);
            mapPast30DPoolRevenue = map30DPoolRevenue;
            addRevenue(mapPast30DPoolRevenue);
            map30DPoolRevenue = 0;
            map30DPoolRevenue = map30DPoolRevenue+(_fee);
        }
    }
    function addRevenue(uint _totalRev) internal {
        if(!(revenueArray.length == 2)){
            revenueArray.push(_totalRev);
        }else {
            addFee(_totalRev);
        }
        }
    
    function addFee(uint _rev) internal {
        uint _n = revenueArray.length;//2
        for (uint i = _n - 1; i > 0; i--) {
        revenueArray[i] = revenueArray[i - 1];
        }
         revenueArray[0] = _rev;
    }

    

}
