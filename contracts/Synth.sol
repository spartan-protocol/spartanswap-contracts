// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./Pool.sol";  
import "./iPOOLFACTORY.sol";

contract Synth is iBEP20 {
    address public BASE;
    address public LayerONE;
    uint public genesis;
    address public DEPLOYER;

    // ERC-20 Parameters
    string _name; string _symbol;
    uint8 public override decimals; uint256 public override totalSupply;

    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;
    mapping(address => uint) public mapSynth_LPBalance;
    mapping(address => uint) public mapSynth_LPDept;
   

    function _DAO() internal view returns(iDAO) {
         return iBASE(BASE).DAO();
    }
    
     modifier onlyDAO() {
        require(msg.sender == DEPLOYER, "!DAO");
        _;
    }
    modifier onlyPool() {
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(msg.sender) == true, "!POOL");
        _;
    }
    

    constructor (address _base,address _token) {
         BASE = _base;
         LayerONE = _token;
        string memory synthName = "-SpartanProtocolSynthetic";
        string memory synthSymbol = "-SPS";
        _name = string(abi.encodePacked(iBEP20(_token).name(), synthName));
        _symbol = string(abi.encodePacked(iBEP20(_token).symbol(), synthSymbol));
        decimals = 18;
        DEPLOYER = msg.sender;
        genesis = block.timestamp;
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
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }
    // iBEP20 Approve, change allowance functions
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender]+(addedValue));
        return true;
    }
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "allowance err");
        _approve(msg.sender, spender, currentAllowance - subtractedValue);
        return true;
    }

     function _approve( address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "sender");
        require(spender != address(0), "spender");
        if (_allowances[owner][spender] < type(uint256).max) { // No need to re-approve if already max
            _allowances[owner][spender] = amount;
            emit Approval(owner, spender, amount);
        }
    }
    
    // iBEP20 TransferFrom function
     function transferFrom(address sender, address recipient, uint256 amount) external virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        // Unlimited approval (saves an SSTORE)
        if (_allowances[sender][msg.sender] < type(uint256).max) {
            uint256 currentAllowance = _allowances[sender][msg.sender];
            require(currentAllowance >= amount, "allowance err");
            _approve(sender, msg.sender, currentAllowance - amount);
        }
        return true;
    }

    //iBEP677 approveAndCall
    function approveAndCall(address recipient, uint amount, bytes calldata data) external returns (bool) {
      _approve(msg.sender, recipient, type(uint256).max); // Give recipient max approval
      iBEP677(recipient).onTokenApproval(address(this), amount, msg.sender, data); // Amount is passed thru to recipient
      return true;
     }

      //iBEP677 transferAndCall
    function transferAndCall(address recipient, uint amount, bytes calldata data) external returns (bool) {
      _transfer(msg.sender, recipient, amount);
      iBEP677(recipient).onTokenTransfer(address(this), amount, msg.sender, data); // Amount is passed thru to recipient 
      return true;
     }


    // Internal transfer function
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "transfer err");
        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "balance err");
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    // Internal mint (upgrading and daily emissions)
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "address err");
        totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }
    // Burn supply
    function burn(uint256 amount) public virtual override {
        _burn(msg.sender, amount);
    }
    function burnFrom(address account, uint256 amount) public virtual {  
        uint256 decreasedAllowance = allowance(account, msg.sender) - (amount);
        _approve(account, msg.sender, decreasedAllowance); 
        _burn(account, amount);
    }
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "address err");
        require(_balances[account] >= amount, "balance err");
        _balances[account] -= amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

    function mintSynth(address member, uint amount) external onlyPool returns (uint syntheticAmount){
        uint lpUnits = _getAddedLPAmount(msg.sender);
        mapSynth_LPDept[msg.sender] += amount;  
        mapSynth_LPBalance[msg.sender] += lpUnits;
        _mint(member, amount); 
        return amount;
    }
    
    function burnSynth() external returns (bool){
         uint _syntheticAmount = balanceOf(address(this));
         uint _amountUnits = (_syntheticAmount * mapSynth_LPBalance[msg.sender]) / mapSynth_LPDept[msg.sender];// share = amount * part/total
         mapSynth_LPBalance[msg.sender] -= _amountUnits;
         mapSynth_LPDept[msg.sender] -= _syntheticAmount;
         if(_amountUnits > 0){
         _burn(address(this), _syntheticAmount); 
         Pool(msg.sender).burn(_amountUnits);
         }
        return true;
    }

    function realise(address pool) external {
        uint baseValueLP = iUTILS(_DAO().UTILS()).calcLiquidityHoldings(mapSynth_LPBalance[pool], BASE, pool);
        uint baseValueSynth = iUTILS(_DAO().UTILS()).calcActualSynthUnits(mapSynth_LPDept[pool], address(this)); 
        if((baseValueLP - baseValueSynth) > 10**18){
            uint premium = baseValueLP - baseValueSynth;
            uint premiumLP = iUTILS(_DAO().UTILS()).calcLiquidityUnitsAsym(premium, pool);
            mapSynth_LPBalance[pool] -= premiumLP;
            Pool(pool).burn(premiumLP);
        }
    }

    function _handleTransferIn(address _token, uint256 _amount) internal returns(uint256 _actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_token).balanceOf(address(this)); 
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount); 
                _actual = iBEP20(_token).balanceOf(address(this))-startBal;
        }
        return _actual;
    }
    function _getAddedLPAmount(address _pool) internal view returns(uint256 _actual){
        uint _lpCollateralBalance = iBEP20(_pool).balanceOf(address(this)); 
        if(_lpCollateralBalance > mapSynth_LPBalance[_pool]){
            _actual = _lpCollateralBalance-(mapSynth_LPBalance[_pool]);
        } else {
            _actual = 0;
        }
        return _actual;
    }

    function getmapAddress_LPBalance(address pool) external view returns (uint){
        return mapSynth_LPBalance[pool];
    }
    function getmapAddress_LPDebt(address pool) external view returns (uint){
        return mapSynth_LPDept[pool];
    }

}
