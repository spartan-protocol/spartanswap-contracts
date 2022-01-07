// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./Pool.sol";  
import "./iPOOLFACTORY.sol";
import "./iRESERVE.sol";

contract Synth is iBEP20 {
    address public immutable BASE;  // Address of SPARTA base token contract
    address public immutable TOKEN; // Underlying relevant layer1 token address
    address public immutable POOL;  // Underlying pool address
    uint public immutable genesis;  // Timestamp from when the synth was first deployed
    uint256 public collateral;      // LP units held on synth contract

    string private _name;
    string private _symbol;
    uint8 public override decimals;
    uint256 public override totalSupply;

    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO(); // Get the DAO address from the Sparta base contract
    }
    
    // Restrict access
    modifier onlyCuratedPool() {
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(msg.sender) == true, "!CURATED");
        _;
    }
    modifier onlyPool() {
        require(msg.sender == POOL, "!POOL");
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(POOL),'!POOL');
        _;
    }
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO());
        _;
    }

    event RealiseCollateral(address indexed pool, uint256 amount);
    
    constructor (address _base, address _token, address _pool) {
        BASE = _base;
        TOKEN = _token;
        POOL = _pool;
        string memory synthName = "-SpartanProtocolSynth";
        string memory synthSymbol = "-SPS";
        _name = string(abi.encodePacked(iBEP20(_token).name(), synthName));
        _symbol = string(abi.encodePacked(iBEP20(_token).symbol(), synthSymbol));
        decimals = iBEP20(_token).decimals();
        genesis = block.timestamp;
    }

    //========================================iBEP20=========================================//

    function name() external view override returns (string memory) {
        return _name;
    }

    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address recipient, uint256 amount) external virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external virtual returns (bool) {
        uint256 currentAllowance = _allowances[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "!approval");
        _approve(msg.sender, spender, currentAllowance - subtractedValue);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "!owner");
        require(spender != address(0), "!spender");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    function transferFrom(address sender, address recipient, uint256 amount) external virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "!approval");
        _approve(sender, msg.sender, currentAllowance - amount);
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "!sender");
        require(recipient != address(0), '!BURN');
        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "!balance");
        _balances[sender] = senderBalance - amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "!account");
        totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function burn(uint256 amount) external virtual override {
      
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "!account");
        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "!balance");
        _balances[account] = accountBalance - amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

    //==================================== SYNTH FUNCTIONS =================================//

    // Handle received LP tokens and mint Synths
    function mintSynth(address member, uint amount) external onlyPool onlyCuratedPool returns (uint syntheticAmount){
        uint lpUnits = _getAddedLPAmount(msg.sender); // Get the received LP units
        collateral += lpUnits; // Increase lp balance by LPs received
        _mint(member, amount); // Mint the synths & tsf to user
        return amount;
    }
    
    // Confirm and burn the received Synths
    function burnSynth(uint _syntheticAmount) external onlyPool returns (uint){
        require(_syntheticAmount > 0, '!AMOUNT'); // Input must not be zero
        uint _amountUnits = (_syntheticAmount * collateral) / totalSupply; // share = amount * part/total
        collateral -= _amountUnits; // Reduce lp balance
        _burn(msg.sender, _syntheticAmount); // Burn the synths
        return _amountUnits;
    }

    // Burn LPs if their value outweights the synths supply value (Ensures incentives are funnelled to existing LPers)
    function realise() external onlyDAO {
        uint baseValueLP = iUTILS(_DAO().UTILS()).calcLiquidityHoldings(collateral, BASE, POOL); // Get the SPARTA value of the LP tokens
        uint baseValueSynth = iUTILS(_DAO().UTILS()).calcActualSynthUnits(address(this), totalSupply); // Get the SPARTA value of the synths
        if(baseValueLP > baseValueSynth){
            uint premium = baseValueLP - baseValueSynth; // Get the premium between the two values
            if(premium > 10**18){
                uint premiumLP = iUTILS(_DAO().UTILS()).calcLiquidityUnitsAsym(premium, POOL); // Get the LP value of the premium
                collateral -= premiumLP; // Reduce the LP balance
                Pool(POOL).burn(premiumLP); // Burn the premium of the LP tokens
                emit RealiseCollateral(POOL, premiumLP);
            }
        }
    }

    // Check the received LP tokens amount
    function _getAddedLPAmount(address _pool) internal view returns(uint256 _actual){
        uint _lpCollateralBalance = iBEP20(_pool).balanceOf(address(this)); // Get total balance held
        if(_lpCollateralBalance > collateral){
            _actual = _lpCollateralBalance - collateral; // Get received amount
        } else {
            _actual = 0;
        }
        return _actual;
    }

}
