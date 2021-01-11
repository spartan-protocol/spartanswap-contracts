// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./IContracts.sol";
import "@nomiclabs/buidler/console.sol";
contract Synth is iBEP20 {
    using SafeMath for uint256;
    address public BASE;

    address public TOKEN;
    uint public genesis;
    uint256 public synthsAmount;
    uint256 public totalCollateral;
    uint256 public totalDebt;

    // ERC-20 Parameters
    string _name; string _symbol;
    uint256 public override decimals; uint256 public override totalSupply;

    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    mapping(address => mapping(address => uint)) public collateralAmount; //member > lp token > colAmount
    mapping(address => mapping(address => uint)) public debtAmount;//member > lp token > debtAmount


    event AddLPCollateral(address member, uint inputLPToken, uint synthsIssued, address collateralType);
    event RemoveCollateral(address member, uint outputLPToken, uint synthsBurnt, address collateralType);

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
    function sync() public {
        synthsAmount = balanceOf(address(this));
    }

    // Add collateral for self
    function addCollateral(address lpToken) public returns(uint synths){
        synths = addCollateralForMember(lpToken, msg.sender);
        return synths;
    }
    
    // add collateral for member
    function addCollateralForMember(address lptoken, address member) public returns(uint syntheticAmount){
        uint256 _actualInputCollateral = _getAddedLPAmount(lptoken);// get the added collateral to LP CDP
        uint baseValueCollateral = iUTILS(_DAO().UTILS()).calcAsymmetricValue(lptoken, _actualInputCollateral);//get asym share in sparta
         syntheticAmount = iUTILS(_DAO().UTILS()).calcSwapValueInTokenWithPool(lptoken, baseValueCollateral); //get synthetic asset swap
         _incrementCDP(baseValueCollateral, syntheticAmount); //update CDP details 
         _updateMemberDetails(lptoken, member, _actualInputCollateral, syntheticAmount);
         _mint(member, syntheticAmount); // mint synth to member
         emit AddLPCollateral(member, _actualInputCollateral, syntheticAmount, lptoken); 
        return syntheticAmount; 
    }
    
    // Remove Collateral
    function removeCollateral(address lptoken) public returns (uint outputCollateral, uint burntDebt) {
         (outputCollateral, burntDebt )= removeCollateralForMember(lptoken,msg.sender);
        return (outputCollateral, burntDebt);
    } 

    // Remove Collateral for a member
    function removeCollateralForMember(address lptoken, address member) public returns (uint outputCollateral, uint debtBurnt) {
        uint256 _actualInputSynths = _getAddedSynthsAmount();
        outputCollateral = iUTILS(_DAO().UTILS()).calcDEBTShare(_actualInputSynths, totalDebt, address(this)); 
        
        _decrementCDP(_actualInputSynths, outputCollateral, lptoken); // update cdp details
        console.log(collateralAmount[member][lptoken]);
        collateralAmount[member][lptoken] = collateralAmount[member][lptoken].sub(outputCollateral);//member collateral lptoken > amount
        debtAmount[member][lptoken] = debtAmount[member][lptoken].sub(_actualInputSynths); //member debt lptoken > amount
        _burn(address(this), _actualInputSynths);
        iBEP20(BASE).transfer(member, outputCollateral); // return their collateral
        emit RemoveCollateral(member, outputCollateral, _actualInputSynths, lptoken);
        return (outputCollateral, _actualInputSynths);
    }

    function _getAddedSynthsAmount() internal view returns(uint256 _actual){
         uint _synthsBalance = balanceOf(address(this)); 
        if(_synthsBalance > synthsAmount){
            _actual = _synthsBalance.sub(synthsAmount);
        } else {
            _actual = 0;
        }
        return _actual;
    }
    function _getAddedLPAmount(address _lptoken) internal view returns(uint256 _actual){
        uint _lpCollateralBalance = iBEP20(_lptoken).balanceOf(address(this)); 
        if(_lpCollateralBalance > totalCollateral[_lptoken]){
            _actual = _lpCollateralBalance.sub(totalCollateral[_lptoken]);
        } else {
            _actual = 0;
        }
        return _actual;
    }


    // Decrement CDP 
    function _decrementCDP(uint _collateral, uint _debt) internal  {
          totalDebt = totalDebt.sub(_debt); // map total debt
         totalCollateral = totalCollateral.sub(_collateral); // map total collateral 
    }
    // Increment CDP 
    function _incrementCDP(uint _collateral, uint _debt) internal  {
         totalDebt = totalDebt.add(_debt); // map total debt
         totalCollateral = totalCollateral.add(_collateral); // map total collateral
    }

    function _updateMemberDetails(address _lpToken, address _member, uint _inputLP, uint syntheticAmount) internal {
         debtAmount[_member][_lpToken]= debtAmount[_member][_lpToken].add(syntheticAmount); //member debt lptoken > amount
         collateralAmount[_member][_lpToken] = collateralAmount[_member][_lpToken].add(_inputLP);//member collateral lptoken > amount

    }

}
