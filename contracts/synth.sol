pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;

import "./poolV2.sol";  
interface iPOOLFACTORY {
    function isCuratedPool(address) external view returns (bool);
    function getPool(address) external view returns (address);
    function isPool(address) external view returns(bool);
}

contract Synth is iBEP20 {
    address public BASE;
    address public LayerONE;
    uint public genesis;
    address public DEPLOYER;
    address public NDAO;

    // ERC-20 Parameters
    string _name; string _symbol;
    uint256 public override decimals; uint256 public override totalSupply;

    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;
    mapping(address => uint) public mapAddress_LPBalance;
    mapping(address => uint) public mapAddress_LPDebt;
   

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
    modifier onlyPool() {
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(msg.sender) == true, "!POOL");
        _;
    }

    constructor (address _base,address _token, address _newDAO) public payable {
         BASE = _base;
         NDAO = _newDAO;
         LayerONE = _token;
        string memory synthName = "-SpartanProtocolSynthetic";
        string memory synthSymbol = "-SPS";
        _name = string(abi.encodePacked(iBEP20(_token).name(), synthName));
        _symbol = string(abi.encodePacked(iBEP20(_token).symbol(), synthSymbol));
        decimals = 18;
        DEPLOYER = msg.sender;
        genesis = block.timestamp ;
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
    function burn(uint256 amount) external virtual {
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
    function transferTo(address recipient, uint256 amount) external returns (bool) {
                _transfer(tx.origin, recipient, amount);
        return true;
    }

    function mintSynth(address member) external onlyPool returns (uint syntheticAmount){
        uint lpUnits = _getAddedLPAmount(msg.sender);
        uint tokenValue = iUTILS(_DAO().UTILS()).calcAsymmetricValueToken(msg.sender, lpUnits);
        mapAddress_LPDebt[msg.sender] += tokenValue;
        mapAddress_LPBalance[msg.sender] += lpUnits;
        _mint(member, tokenValue); 
        return tokenValue;
    }
    
    function burnSynth() external returns (bool){
         uint _syntheticAmount = balanceOf(address(this));
         uint _amountUnits = (_syntheticAmount*mapAddress_LPBalance[msg.sender])/mapAddress_LPDebt[msg.sender];// share = amount * part/total
         mapAddress_LPBalance[msg.sender] -= _amountUnits;
         mapAddress_LPDebt[msg.sender] -= _syntheticAmount;
         if(_amountUnits > 0){
         _burn(address(this), _syntheticAmount); 
         Pool(msg.sender).burn(_amountUnits);
         }
        return true;
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
        if(_lpCollateralBalance > mapAddress_LPBalance[_pool]){
            _actual = _lpCollateralBalance-(mapAddress_LPBalance[_pool]);
        } else {
            _actual = 0;
        }
        return _actual;
    }

    function getmapAddress_LPBalance(address pool) external returns (uint){
        return mapAddress_LPBalance[pool];
    }
    function getmapAddress_LPDebt(address pool) external returns (uint){
        return mapAddress_LPDebt[pool];
    }
    function destroyMe() external onlyDAO {
        selfdestruct(payable(msg.sender));
    } 

}
