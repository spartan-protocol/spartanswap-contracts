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
    function calcAsymmetricValue(address token, uint units) external view returns(uint amount);
    function calcDebtShare(uint units, uint amount, address, address synth) external view returns (uint unitSynths);
    function calcSwapValueInToken(address token, uint units) external view returns (uint amount);
    function allCuratedPools() external view returns (address [] memory);
   
}
interface iDAO {
    function ROUTER() external view returns(address);
    function UTILS() external view returns(address);
    function DAO() external view returns (address);
    function ASSETCURATION() external view returns (address);
   
}
interface iPOOL {
    function TOKEN() external view returns(address);
    function sync() external; 
}
interface iASSETCURATION {
    function isCuratedPool(address) external view returns (bool);
    function isSynth(address) external view returns (bool);
}


contract SpartanLoanVault {
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
        CLBFactor = 2000;
        DEPLOYER = msg.sender;
        liqFactor = 1000;
        genesis = now;
    }

    // Add collateral for self
    function addCollateral(address pool) public returns(uint synths){
        synths = addCollateralForMember(pool, msg.sender);
        return synths;
    } 
    
    // add collateral for member
    function addCollateralForMember(address pool, address member) public returns(uint syntheticAmount){
        require(iASSETCURATION(_DAO().ASSETCURATION()).isCuratedPool(pool) == true, '!POOL');
        uint256 _actualInputCollateral = _getAddedLPAmount(pool);// get the added collateral to LP CDP
        uint256 inputCollateralBuffer = _actualInputCollateral.mul(CLBFactor).div(10000);
        uint256 bufferedCollateral = _actualInputCollateral.sub(inputCollateralBuffer);
        uint baseValueCollateral = iUTILS(_DAO().UTILS()).calcAsymmetricValue(pool, bufferedCollateral);//get asym share in sparta
         syntheticAmount = iUTILS(_DAO().UTILS()).calcSwapValueInToken(LayerONE, baseValueCollateral); //get synthetic asset swap
         totalMinted = totalMinted.add(syntheticAmount); //map synthetic debt
         _incrementCDPCollateral(_actualInputCollateral, syntheticAmount, pool); //update CDP Collateral details
         _incrementMemberDetails(pool, member, syntheticAmount); //update member details
        //  _mint(member, syntheticAmount); // mint synth to member
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
        // _burn(address(this), _actualInputSynths);
        iBEP20(pool).transfer(member, outputCollateral); // return their collateral
        emit RemoveCollateral(member, outputCollateral, _actualInputSynths, pool);
        return (outputCollateral, _actualInputSynths);
    }

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

    // function _liquidate(address pool) public {
    //     uint256 baseValueCollateral = iUTILS(_DAO().UTILS()).calcAsymmetricValue(pool, totalCollateral[pool]);
    //     uint256 baseValueDebt = iUTILS(_DAO().UTILS()).calcSwapValueInBaseWithPool(pool, totalDebt[pool]);//get asym share in sparta
    //     if(baseValueDebt > baseValueCollateral){
    //         uint liqAmount = totalCollateral[pool].mul(liqFactor).div(10000);
    //         totalCollateral[pool] = totalCollateral[pool].sub(liqAmount);
    //         address token = iPOOL(pool).TOKEN();
    //         iBEP20(pool).approve(_DAO().ROUTER(),liqAmount);
    //         (uint _outputBase, uint _outputToken) = iROUTER(_DAO().ROUTER()).removeLiquidityExact(liqAmount,token);
    //         iBEP20(token).approve(_DAO().ROUTER(),_outputToken); 
    //         (uint _baseBought,) = iROUTER(_DAO().ROUTER()).swap(_outputToken,token, BASE);
    //         uint outputAmount = _baseBought.add(_outputBase); 
    //         iBEP20(BASE).transfer(pool, outputAmount); // send base to pool for arb 
    //         iPOOL(pool).sync(); //sync balances for pool
    //         emit Liquidated(pool, liqAmount, outputAmount);
    //     }
    // }

    // function globalSettleMent() public onlyDAO {
    //     address [] memory getCuratedPools = iUTILS(_DAO().UTILS()).allCuratedPools(); 
    //       if(membersActiveCount < 10){
    //         for(uint x=0;x < membersActive.length;x++){
    //         for(uint i=0;i < getCuratedPools.length;i++){
    //             if(mapMember_Details[membersActive[x]].isActiveMember[getCuratedPools[i]] ){
    //                 uint256 outputCollateral = iUTILS(_DAO().UTILS()).calcDebtShare(mapMember_Details[membersActive[x]].synthDebt[getCuratedPools[i]], totalDebt[getCuratedPools[i]], getCuratedPools[i], address(this)); 
    //                 totalMinted = totalMinted.sub(mapMember_Details[membersActive[x]].synthDebt[getCuratedPools[i]]); //map synthetic debt
    //                 _decrementCDPDebt(outputCollateral, mapMember_Details[membersActive[x]].synthDebt[getCuratedPools[i]], getCuratedPools[i] );
    //                 _decrementMemberDetails(getCuratedPools[i], membersActive[x], mapMember_Details[membersActive[x]].synthDebt[getCuratedPools[i]]); //update member details
    //                 iBEP20(getCuratedPools[i]).transfer(membersActive[x], outputCollateral); //return their collateral
    //                 emit RemoveCollateral(membersActive[x], outputCollateral, mapMember_Details[membersActive[x]].synthDebt[getCuratedPools[i]], getCuratedPools[i]);
    //             }
    //           }
    //           }
    //         totalMinted = 0;
    //         selfdestruct(msg.sender);
    // }
    // }
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