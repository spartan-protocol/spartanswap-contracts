// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./IContracts.sol";
import "@nomiclabs/buidler/console.sol";
contract Synth is iBEP20 {
    using SafeMath for uint256;
    address public BASE;
    uint256 public one = 10**18;

    address public TOKEN;
    uint public genesis;
    uint public totalCollateral;
    uint public totalDebt;

    // ERC-20 Parameters
    string _name; string _symbol;
    uint256 public override decimals; uint256 public override totalSupply;

    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    mapping(address => mapping(address => uint)) public collateralAmount; //member > lp token > colAmount
    mapping(address => uint) public debtAmount; //member > synth > debtAmount
   

    event AddLPCollateral(address member, uint inputLPToken, uint synthsIssued);

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    constructor (address _base,address _token) public payable {
         BASE = _base;
         TOKEN = _token;
        string memory synthName = "SpartanSynthV1-";
        string memory synthSymbol = "SSTV1-";
        _name = string(abi.encodePacked(synthName, iBEP20(_token).name()));
        _symbol = string(abi.encodePacked(synthSymbol, iBEP20(_token).symbol()));
        decimals = 18;
        genesis = now;
        
     
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
        _allowances[from][msg.sender] = _allowances[from][msg.sender].sub(value);
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
        totalSupply = totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
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
        _balances[account] = _balances[account].sub(amount, "BalanceErr");
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }
    // TransferTo function
    function transferTo(address recipient, uint256 amount) public returns (bool) {
                _transfer(tx.origin, recipient, amount);
        return true;
    }

    function swapSynth()public payable returns(uint256 outputAmount, uint256 fee){

    }

    // Add collateral for self
    function addCollateral(address lpToken) public returns(uint synths){
        synths = addCollateralForMember(lpToken, msg.sender);
        return synths;
    }
    function _getAddedCollateralAmount(address _lptoken) internal view returns(uint256 _actual){
        uint _lpCollateralBalance = iBEP20(_lptoken).balanceOf(address(this)); 
        if(_lpCollateralBalance > totalCollateral){
            _actual = _lpCollateralBalance.sub(totalCollateral);
        } else {
            _actual = 0;
        }
        return _actual;
    }
    // add collateral for member
    function addCollateralForMember(address lptoken, address member) public returns(uint synths){
        uint256 _actualInputCollateral = _getAddedCollateralAmount(lptoken);// get the added collateral to LP CDP
        uint _baseAmount = iPOOL(lptoken).baseAmount(); //used to calc assymetricalShare
        uint _lpTotalSupply = iPOOL(lptoken).baseAmount(); //used to calc assymetricalShare
        uint baseValue = iUTILS(_DAO().UTILS()).calcAsymmetricShare(lptoken, member);//get asym share in sparta
         synths = iUTILS(_DAO().UTILS()).calcSwapValueInTokenWithPool(lptoken, baseValue); //get swap value with sparta
         totalDebt = totalDebt.add(synths); // map total debt
         totalCollateral = totalCollateral.add(_actualInputCollateral); // map total collateral
         collateralAmount[member][lptoken] = collateralAmount[member][lptoken].add(_actualInputCollateral);//member collateral lptoken > amount
         debtAmount[member]= debtAmount[member].add(synths); //member debt lptoken > amount
         _mint(member, synths); // mint synth to member
         emit AddLPCollateral(member, _actualInputCollateral, synths); 
        return synths;
    }
    
    // Remove Collateral
    function removeCollateral() public returns (uint outputToken) {
        //return removeCollateralForMember(msg.sender);
    } 

    // Remove Collateral for a member
    // function removeCollateralForMember(address member) public returns ( uint outputToken) {
    //     uint units = balanceOf(member);
    //     outputToken = iUTILS(_DAO().UTILS()).calcShare(units, TOKEN, address(this), member);
    //     _decrementPoolBalances(outputBase, outputToken);
    //     _burn(address(this), units);
    //     iBEP20(BASE).transfer(member, outputBase);
    //     iBEP20(TOKEN).transfer(member, outputToken);
    //     emit RemoveLiquidity(member, outputBase, outputToken, units);
    //     return (outputBase, outputToken);
    // }
  
  
}
