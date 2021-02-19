// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./cInterfaces.sol";
import "@nomiclabs/buidler/console.sol";
interface iBASE {
    function DAO() external view returns (iDAO);
}
interface iROUTER {
    function swap(uint, address, address) external returns(uint, uint);
    function removeLiquidityExact(uint, address) external returns(uint, uint);
}
interface iUTILS {
   function calcSwapValueInBaseWithPool(address pool, uint amount) external view returns (uint value);
    function calcAsymmetricValueBase(address pool, uint amount) external pure returns (uint units);
    function calcAsymmetricValueToken(address pool, uint amount) external pure returns (uint units);
    function calcDebtShare(uint units, uint amount, address, address synth) external view returns (uint unitSynths);
    function calcSwapValueInToken(address token, uint units) external view returns (uint amount);
    function allCuratedPools() external view returns (address [] memory);
    function calcLiquidityUnitsAsymToken(uint amount, address pool) external view returns (uint units);
   
}
interface iDAO {
    function ROUTER() external view returns(address);
    function UTILS() external view returns(address);
    function DAO() external view returns (address);
    function POOLCURATION() external view returns (address);
   
}
interface iPOOL {
    function TOKEN() external view returns(address);
    function sync() external;
}
interface iPOOLCURATION {
    function isCuratedPool(address) external view returns (bool);

}


contract Synth is iBEP20 {
    using SafeMath for uint256;
    uint32 private membersActiveCount;
    address public BASE;
    address public LayerONE;
    uint public genesis;
    address public DEPLOYER;
    uint32 liqFactor;// Liquidation amount default 10%
    uint32 CLBFactor;// Collateral Buffer 10% - ex. $150 - $15 = $135, 150/135*100 = Collateralisation ratio = 111%
    uint256 public synthsAmount;
    uint256 public totalMinted;
    address [] public membersActive;

    struct CollateralDetails {
        uint ID;
        mapping(address => bool) isActiveMember;
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
    event Liquidated(address pool, uint units, uint outputAmount);

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
        string memory synthSymbol = "SST1-s";
        _name = string(abi.encodePacked(synthName, iBEP20(_token).name()));
        _symbol = string(abi.encodePacked(synthSymbol, iBEP20(_token).symbol()));
        decimals = 18;
        CLBFactor = 2000;
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

     function swapBaseIN(address token, address member) public returns (uint syntheticAmount){
        require(token != BASE, '!BASE');
        require(iPOOLCURATION(_DAO().POOLCURATION()).isCuratedPool(msg.sender) == true, '!POOL');
        uint lpUnits = _getAddedLPAmount(msg.sender);
        uint tokenValue = iUTILS(_DAO().UTILS()).calcAsymmetricValueToken(msg.sender, lpUnits);//get asym share in sparta
        _mint(member, tokenValue); // mint synths
        return tokenValue;
    }
    
    function swapBaseOUT(uint amount) public returns (uint LPunits){
        require(iPOOLCURATION(_DAO().POOLCURATION()).isCuratedPool(msg.sender) == true, '!POOL');
        uint syntheticAmount = _handleTransferIn(address(this), amount);
         _burn(address(this), syntheticAmount); 
         LPunits = iUTILS(_DAO().UTILS()).calcLiquidityUnitsAsymToken(syntheticAmount, msg.sender);
         iBEP20(msg.sender).transfer(msg.sender, LPunits);
        return LPunits;
    }


    function _handleTransferIn(address _token, uint256 _amount) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_token).balanceOf(address(this)); 
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount); 
                actual = iBEP20(_token).balanceOf(address(this)).sub(startBal);
        }
        return actual;
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
       if(!mapMember_Details[_member].isActiveMember[pool]){
           console.log(_member);
           membersActive.push(_member);
           membersActiveCount += 1;
           mapMember_Details[_member].isActiveMember[pool] = true;
       }
    }
    function _decrementMemberDetails(address pool, address _member, uint _synthBurnt) internal {
       mapMember_Details[_member].synthDebt[pool] = mapMember_Details[_member].synthDebt[pool].sub(_synthBurnt);
       if(mapMember_Details[_member].synthDebt[pool] == 0){
           mapMember_Details[_member].isActiveMember[pool] = false;
           membersActiveCount -= 1;
       }
    }

    function _liquidate(address pool) public {
        uint256 baseValueCollateral = iUTILS(_DAO().UTILS()).calcAsymmetricValueBase(pool, totalCollateral[pool]);
        uint256 baseValueDebt = iUTILS(_DAO().UTILS()).calcSwapValueInBaseWithPool(pool, totalDebt[pool]);//get asym share in sparta
        if(baseValueDebt > baseValueCollateral){
            uint liqAmount = totalCollateral[pool].mul(liqFactor).div(10000);
            totalCollateral[pool] = totalCollateral[pool].sub(liqAmount);
            address token = iPOOL(pool).TOKEN();
            iBEP20(pool).approve(_DAO().ROUTER(),liqAmount);
            (uint _outputBase, uint _outputToken) = iROUTER(_DAO().ROUTER()).removeLiquidityExact(liqAmount,token);
            iBEP20(token).approve(_DAO().ROUTER(),_outputToken); 
            (uint _baseBought,) = iROUTER(_DAO().ROUTER()).swap(_outputToken,token, BASE);
            uint outputAmount = _baseBought.add(_outputBase); 
            iBEP20(BASE).transfer(pool, outputAmount); // send base to pool for arb 
            iPOOL(pool).sync(); //sync balances for pool
            emit Liquidated(pool, liqAmount, outputAmount);
        }
    }

    function globalSettleMent() public onlyDAO {
        address [] memory getCuratedPools = iUTILS(_DAO().UTILS()).allCuratedPools(); 
          if(membersActiveCount < 10){
            for(uint x=0;x < membersActive.length;x++){
            for(uint i=0;i < getCuratedPools.length;i++){
                if(mapMember_Details[membersActive[x]].isActiveMember[getCuratedPools[i]] ){
                    uint256 outputCollateral = iUTILS(_DAO().UTILS()).calcDebtShare(mapMember_Details[membersActive[x]].synthDebt[getCuratedPools[i]], totalDebt[getCuratedPools[i]], getCuratedPools[i], address(this)); 
                    totalMinted = totalMinted.sub(mapMember_Details[membersActive[x]].synthDebt[getCuratedPools[i]]); //map synthetic debt
                    _decrementCDPDebt(outputCollateral, mapMember_Details[membersActive[x]].synthDebt[getCuratedPools[i]], getCuratedPools[i] );
                    _decrementMemberDetails(getCuratedPools[i], membersActive[x], mapMember_Details[membersActive[x]].synthDebt[getCuratedPools[i]]); //update member details
                    iBEP20(getCuratedPools[i]).transfer(membersActive[x], outputCollateral); //return their collateral
                    emit RemoveCollateral(membersActive[x], outputCollateral, mapMember_Details[membersActive[x]].synthDebt[getCuratedPools[i]], getCuratedPools[i]);
                }
              }
              }
            totalMinted = 0;
            selfdestruct(msg.sender);
    }
    }
    function destroyMe() public onlyDAO {
        selfdestruct(msg.sender);
    } 

    function changeLiqFactor(uint32 newliqFactor) public onlyDAO {
          require(newliqFactor > 10 || newliqFactor < 10000);
          liqFactor = newliqFactor;
    }
    function changeCLBFactor(uint32 newCLBFactor) public onlyDAO {
        require(newCLBFactor > 1000 || newCLBFactor < 10000);
          CLBFactor = newCLBFactor;
    }

//=========================================HELPERS===============================================
    function getMemberDetails(address member, address pool) public view returns (uint MemberDebt){
        MemberDebt = mapMember_Details[member].synthDebt[pool];
        return MemberDebt;
    }

    function getMemberLength() public view returns (uint memberCount){
        memberCount = membersActive.length;
        return memberCount;
    }

}
