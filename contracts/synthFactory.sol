// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./IContracts.sol";

import "@nomiclabs/buidler/console.sol";
contract Synth is iBEP20 {
    using SafeMath for uint256;
    address public BASE;
    address public LayerONE;
    address public WBNB;
    uint public genesis;
    address public DEPLOYER;
    uint liqFactor;
    uint256 public synthsAmount;
    
    uint256 public totalMinted;

    struct CollateralDetails {
        uint id;
        mapping(address => uint) synthDebt;
    }

    // ERC-20 Parameters
    string _name; string _symbol;
    uint256 public override decimals; uint256 public override totalSupply;

    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    mapping(address => CollateralDetails) public mapMember_Details;
    mapping(address => uint) public totalCollateral;
    mapping(address => uint) public totalDebt;

    event AddLPCollateral(address member, uint inputLPToken, uint synthsIssued, address collateralType);
    event RemoveCollateral(address member, uint outputLPToken, uint synthsBurnt, address collateralType);
    event Liquidated(address pool, uint units);

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }
     modifier onlyDAO() {
        require(msg.sender == DEPLOYER, "Must be DAO");
        _;
    }

    constructor (address _base,address _token) public payable {
         BASE = _base;
         LayerONE = _token;
        string memory synthName = "SpartanSynthV1-";
        string memory synthSymbol = "SSTV1-";
        _name = string(abi.encodePacked(synthName, iBEP20(_token).name()));
        _symbol = string(abi.encodePacked(synthSymbol, iBEP20(_token).symbol()));
        decimals = 18;
        DEPLOYER = msg.sender;
        liqFactor = 1000;
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

    function sync() public {
        synthsAmount = balanceOf(address(this));
    }

    // Add collateral for self
    function addCollateral(address pool) public returns(uint synths){
        synths = addCollateralForMember(pool, msg.sender);
        return synths;
    } 
    
    // add collateral for member
    function addCollateralForMember(address pool, address member) public returns(uint syntheticAmount){
        uint256 _actualInputCollateral = _getAddedLPAmount(pool);// get the added collateral to LP CDP
        uint baseValueCollateral = iUTILS(_DAO().UTILS()).calcAsymmetricValue(pool, _actualInputCollateral);//get asym share in sparta
         syntheticAmount = iUTILS(_DAO().UTILS()).calcSwapValueInToken(LayerONE, baseValueCollateral); //get synthetic asset swap
         totalMinted = totalMinted.add(syntheticAmount); //map synthetic debt
         _incrementCDPCollateral(_actualInputCollateral, syntheticAmount, pool); //update CDP Collateral details
         _incrementMemberDetails(pool, member, syntheticAmount); //update member details
         _mint(member, syntheticAmount); // mint synth to member
         emit AddLPCollateral(member, _actualInputCollateral, syntheticAmount, pool); 
        return syntheticAmount; 
    }

    // Remove Collateral
    function removeCollateral(address pool) public returns (uint outputCollateral, uint burntDebt) {
         (outputCollateral, burntDebt)= removeCollateralForMember(pool, msg.sender);
        return (outputCollateral, burntDebt);
    } 

    // Remove Collateral for a member
    function removeCollateralForMember(address pool, address member) public returns (uint outputCollateral, uint debtBurnt) {
        uint256 _actualInputSynths = _getAddedSynthsAmount(address(this));
        require(mapMember_Details[member].synthDebt[pool] >= _actualInputSynths, 'INPUTERR');
        outputCollateral = iUTILS(_DAO().UTILS()).calcDebtShare(_actualInputSynths, totalDebt[pool], pool, address(this));  
        totalMinted = totalMinted.sub(_actualInputSynths); //map synthetic debt
        _decrementCDPDebt(outputCollateral, _actualInputSynths, pool );
        _decrementMemberDetails(pool, member, _actualInputSynths); //update member details
        _burn(address(this), _actualInputSynths);
        iBEP20(pool).transfer(member, outputCollateral); // return their collateral
        emit RemoveCollateral(member, outputCollateral, _actualInputSynths, pool);
        return (outputCollateral, _actualInputSynths);
    }

     function swapIN(uint amount, address token, address member) public returns (uint syntheticAmount){
        require(token != BASE, '!BASE');
        require(iROUTER(_DAO().ROUTER()).isCuratedPool(msg.sender) == true, '!POOL');
         syntheticAmount = _handleTransferIn(token, amount);
         totalMinted = totalMinted.add(syntheticAmount); //map synthetic debt
        _mint(member, syntheticAmount); // mint synths
        iBEP20(token).transfer(msg.sender, syntheticAmount);//return token back into pool
        return syntheticAmount;
    }
    
    function swapOUT(uint amount) public returns (uint syntheticAmount){
        require(iROUTER(_DAO().ROUTER()).isCuratedPool(msg.sender) == true, '!POOL');
         syntheticAmount = _handleTransferIn(address(this), amount);
         totalMinted = totalMinted.sub(syntheticAmount); //map synthetic debt
         _burn(address(this), syntheticAmount); // burn synths
        return syntheticAmount;
    }


// Token Transfer Functions
    function _handleTransferIn(address _token, uint256 _amount) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_token).balanceOf(address(this)); 
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount); 
                actual = iBEP20(_token).balanceOf(address(this)).sub(startBal);
        }
    }

    function _getAddedSynthsAmount(address synth) internal view returns(uint256 _actual){
         uint _synthsBalance = iBEP20(synth).balanceOf(address(this)); 
        if(_synthsBalance > synthsAmount){
            _actual = _synthsBalance.sub(synthsAmount);
        } else {
            _actual = 0;
        }
        return _actual;
    }
    function _getAddedLPAmount(address pool) internal view returns(uint256 _actual){
        uint _lpCollateralBalance = iBEP20(pool).balanceOf(address(this)); 
        if(_lpCollateralBalance > totalCollateral[pool]){
            _actual = _lpCollateralBalance.sub(totalCollateral[pool]);
        } else {
            _actual = 0;
        }
        return _actual;
    }

    function _incrementCDPCollateral(uint _inputLP, uint _synthDebt, address pool) internal  {
         totalDebt[pool] = totalDebt[pool].add(_synthDebt);
         totalCollateral[pool] = totalCollateral[pool].add(_inputLP);
    }
    function _decrementCDPDebt(uint _outputLP, uint _synthReturned, address pool) internal  {
         totalDebt[pool] = totalDebt[pool].sub(_synthReturned);
         totalCollateral[pool] = totalCollateral[pool].sub(_outputLP);
    }
    function _incrementMemberDetails(address pool, address _member, uint _synthMinted) internal {
       mapMember_Details[_member].synthDebt[pool] = mapMember_Details[_member].synthDebt[pool].add(_synthMinted);
    }
    function _decrementMemberDetails(address pool, address _member, uint _synthBurnt) internal {
       mapMember_Details[_member].synthDebt[pool] = mapMember_Details[_member].synthDebt[pool].sub(_synthBurnt);
    }

    function _liquidate(address pool) public {
        uint256 baseValueCollateral = iUTILS(_DAO().UTILS()).calcAsymmetricValue(pool, totalCollateral[pool]);
        uint256 baseValueDebt = iUTILS(_DAO().UTILS()).calcSwapValueInBaseWithPool(pool, totalDebt[pool]);//get asym share in sparta
        if(baseValueDebt < baseValueCollateral){
            uint liqAmount = totalCollateral[pool].mul(liqFactor).div(10000);
            totalCollateral[pool] = totalCollateral[pool].sub(liqAmount);
            address token = iPOOL(pool).TOKEN();
            iBEP20(pool).approve(_DAO().ROUTER(),liqAmount);
            (uint _outputBase, uint _outputToken) = iROUTER(_DAO().ROUTER()).removeLiquidityExact(liqAmount,token);
            iBEP20(token).approve(_DAO().ROUTER(),_outputToken); 
            (uint _baseBought, uint _fee) = iROUTER(_DAO().ROUTER()).swap(_outputToken,token, BASE);
            uint outputAmount = _baseBought.add(_outputBase); 
            iBEP20(BASE).transfer(pool, outputAmount); // send base to pool for arb 
            iPOOL(pool).sync(); //sync balances for pool
            emit Liquidated(pool, liqAmount);
        }
    }

    function changeLiqFactor(uint newliqFactor) public onlyDAO {
          require(newliqFactor > 10 || newliqFactor < 10000);
          liqFactor = newliqFactor;
    }

//=========================================HELPERS===============================================
    function getMemberDetails(address member, address pool) public view returns (uint MemberDebt){
        MemberDebt = mapMember_Details[member].synthDebt[pool];
        return MemberDebt;
    }


}
