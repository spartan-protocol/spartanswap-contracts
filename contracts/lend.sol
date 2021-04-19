// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "@nomiclabs/buidler/console.sol";
import "./lendRouter.sol";

contract SpartanLend {

    address public BASE;
    address public DEPLOYER;
    address public LENDROUTER;
    uint public currentDay;
    uint public OneHR;
    uint public OneDAY;
    uint public reserve;
    address [] debtAssets;

    struct CollateralDetails {
        uint ID;
        mapping(address => DebtDetails) mapMember_Debt;
    }
    struct DebtDetails{
        uint ID;
        mapping(address =>uint256) assetCollateral; //assetC > AssetD > AmountCol
        mapping(address =>uint256) assetCollateralDeposit; //assetC > AssetD > AmountCol
        mapping(address =>uint256) assetDebt; //assetC > AssetD > AmountDebt
        mapping(address =>uint256) timeBorrowed; // assetC > AssetD > time
        // mapping(address =>uint256) currentDay; // assetC > AssetD > time
    }
    struct MemberDetails {
        uint assetCurrentCollateral;
        uint assetDebt;
        uint timeBorrowed;
    }
    mapping(address => CollateralDetails) private mapMember_Details;
    mapping(address => mapping(address => uint)) public mapAddress_totalCollateral;
    mapping(address => mapping(address => uint)) public mapAddress_totalDebt;
    mapping(address => mapping(address => uint)) public mapAddress_timeLoaned;
    mapping(address => bool) public isDebtAsset;
    mapping(address => bool) public isCollateralAsset;

    event AddCollateral(uint inputToken, address indexed Debt, uint DebtIssued);
    event RemoveCollateral(uint inputToken, address indexed Debt, uint DebtReturned);
    event InterestPaid(address indexed Collateral, uint Interest, address indexed DebtPool);
    event Liquidated(address indexed assetC,address indexed assetD, uint liquidationAmount);


    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _; 
    }

    constructor (address _base, address _lendRouter) public {
        BASE = _base;
        LENDROUTER = _lendRouter;
        OneHR = 1;
        OneDAY = 4; // 86400
        DEPLOYER = msg.sender;
        currentDay = block.timestamp;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }
 
    // Add collateral for self
    function borrow(uint amount, address assetC, address assetD) public returns (uint assetDebt) {
        assetDebt = borrowForMember(amount, assetC, assetD,msg.sender);
        return assetDebt;
    }
    // Add collateral for member
    function borrowForMember(uint amount, address assetC, address assetD, address member) public returns (uint256 assetDebtIssued) {
        (uint actualInputAssetC, uint baseBorrow) = _handleTransferInCol(amount,assetC);
        require(baseBorrow <= reserve,'!Reserve');
        if(mapAddress_totalDebt[assetC][assetD] == 0){
            mapAddress_timeLoaned[assetC][assetD] = block.timestamp;
        }
        if(isDebtAsset[assetD] == false){
            debtAssets.push(assetD);
            isDebtAsset[assetD] = true;
        }
        if(isCollateralAsset[assetC] == false){
            isCollateralAsset[assetC] = true;
        }
        reserve -= baseBorrow;
        iBEP20(BASE).transfer(LENDROUTER,baseBorrow);
        assetDebtIssued = LendRouter(LENDROUTER).depositForMember(assetD);
        _incrCDP(actualInputAssetC,assetC, assetDebtIssued, assetD);
        _incrMemberDetails(actualInputAssetC,assetC, member, assetDebtIssued, assetD); //update member details
        iBEP20(assetD).transfer(member, assetDebtIssued);
        emit AddCollateral(amount, assetD, assetDebtIssued);
        return assetDebtIssued;
    }


    // Remove collateral for self
    function payBack(uint amount, address assetC, address assetD) public returns (uint _assetCollateralRemoved){
        return payBackForMember(amount, assetC, assetD, msg.sender);
    }
     // Remove collateral for member
    function payBackForMember(uint amount,address assetC, address assetD, address member) public returns (uint _assetCollateralRemoved){
         require(block.timestamp >= mapMember_Details[member].mapMember_Debt[assetC].timeBorrowed[assetD]+(OneHR));// min 1hr withdraw period 
         require(mapAddress_totalCollateral[assetC][assetD] > 0, 'PURGED');
         require(mapAddress_totalDebt[assetC][assetD] >= amount, 'INPUTERR');
         uint actualInputAssetD = _handleTransferInDebt(assetD, amount, member); 
         uint baseReturned = LendRouter(LENDROUTER).removeForMember(assetD);
         reserve += baseReturned;
         _assetCollateralRemoved = iUTILS(_DAO().UTILS()).calcShare(mapAddress_totalCollateral[assetC][assetD], mapAddress_totalDebt[assetC][assetD], actualInputAssetD);
         _decrCDP(_assetCollateralRemoved,assetC, actualInputAssetD, assetD);
         _decrMemberDetails(_assetCollateralRemoved, assetC, member, actualInputAssetD, assetD);
         iBEP20(assetC).transfer(member, _assetCollateralRemoved);
        if(mapAddress_totalDebt[assetC][assetD] == 0){
            mapAddress_timeLoaned[assetC][assetD] = 0;
        }
        emit RemoveCollateral(_assetCollateralRemoved, assetD, actualInputAssetD);
        return _assetCollateralRemoved;
    }


    function calcInterestAmount(address _assetC, address _assetD) internal view returns (uint){
        address _assetDPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(_assetD); 
        uint _poolDepth = iPOOL(_assetDPool).tokenAmount();
        uint _poolDebt = mapAddress_totalDebt[_assetC][_assetD];
        return (_poolDebt*(10**18))/_poolDepth;
    }

     function checkInterest(address assetC) external {
         uint256 _interest = 0; 
        if(isCollateralAsset[assetC] == true){
         for(uint i = 0; i<debtAssets.length; i++){
            if(block.timestamp >= mapAddress_timeLoaned[assetC][debtAssets[i]]+(OneDAY)){
                 uint256 _interestPayable = calcInterestAmount(assetC, debtAssets[i]); 
                 uint256 _IR = (_interestPayable/365)*1;//per day
                //   console.log("IR", _IR); 
                 uint256 _percentAmount = mapAddress_totalCollateral[assetC][debtAssets[i]]*(_IR)/(10**18);     
                 // console.log("_percentAmount_", _percentAmount);   
                 mapAddress_timeLoaned[assetC][debtAssets[i]] = block.timestamp;                 
                 _interest = _payInterest(assetC, _percentAmount, debtAssets[i]);  
                 // console.log("interest--", interest); 
                  _checkPurge(assetC, _interest,debtAssets[i]);
                 
                 emit InterestPaid(assetC,_interest, debtAssets[i]);    
             }
           }  
         }                                                                                                      
    }

    function checkliquidate(address assetC) public returns (uint fee){
        uint _baseCollateral; uint _baseDebt; 
         if(isCollateralAsset[assetC] == true){
         for(uint i = 0; i<debtAssets.length; i++){
            _baseCollateral = getBaseValue(assetC, debtAssets[i]);
            _baseDebt = iUTILS(_DAO().UTILS()).calcSwapValueInBase(debtAssets[i], mapAddress_totalDebt[assetC][debtAssets[i]]);
            // console.log("baseDebt",baseDebt/10**18);
            // console.log("baseColl",baseCollateral/10**18);
            if(_baseCollateral <= _baseDebt){
                uint _liquidation = mapAddress_totalCollateral[assetC][debtAssets[i]]*500/10000;//5%
                _payInterest(assetC,_liquidation, debtAssets[i]);
               _feeReward(_baseCollateral*100/10000);//1%
               console.log("liquidated, ",_liquidation);
               emit Liquidated(assetC, debtAssets[i], _liquidation);
            }   
            }
        }  
        return fee;
    }

    function _feeReward(uint _fee) internal returns (bool){
        if(reserve <= _fee){
                iBEP20(BASE).transfer(msg.sender, reserve);//send reserve to caller
                reserve = 0;
             }else{
                iBEP20(BASE).transfer(msg.sender, _fee);//send fee to caller 
                reserve -= _fee;
         }
         return true;
    }
    
    function getBaseValue(address _assetC, address _assetD) internal view returns (uint){
         uint _baseCollateral; 
        if(_assetC == BASE){
               _baseCollateral = mapAddress_totalCollateral[_assetC][_assetD];
             }else if(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(_assetC) == true){   
               _baseCollateral = iUTILS(_DAO().UTILS()).calcAsymmetricValueBase(_assetC, mapAddress_totalCollateral[_assetC][_assetD]);
             }else if(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(_assetC) == true){
               _baseCollateral = iUTILS(_DAO().UTILS()).calcSwapValueInBaseWithSYNTH(_assetC, mapAddress_totalCollateral[_assetC][_assetD]); 
            }
        return _baseCollateral;
    }

    function _checkPurge(address _assetC, uint _interestBase, address _assetD) internal returns (bool){
        uint baseCollateral = getBaseValue(_assetC,_assetD);
        if(baseCollateral <= _interestBase){
            _feeReward(baseCollateral*100/10000);
            _payInterest(_assetC,mapAddress_totalCollateral[_assetC][_assetD], _assetD);//100%
            mapAddress_totalDebt[_assetC][_assetD] = 0;
            mapAddress_totalCollateral[_assetC][_assetD] = 0;
         return true;
        }
    }

    // handle input LP transfers 
    function _handleTransferInDebt(address _assetC, uint256 _amount, address _member) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_assetC).balanceOf(LENDROUTER);
                    iBEP20(_assetC).transferFrom(_member, LENDROUTER, _amount); 
                actual = iBEP20(_assetC).balanceOf(LENDROUTER)-(startBal);
        }
        return actual;
    }
    function _handleTransferInCol( uint256 _amount, address _assetC) internal returns(uint256 _actual, uint _baseBorrow){
        if(_amount > 0) {
                uint collateralAdjusted = _amount*6666/10000; //150% collateral Ratio
                uint startBal = iBEP20(_assetC).balanceOf(address(this));
            if(_assetC == BASE){
                _baseBorrow = collateralAdjusted;
                iBASE(_assetC).transferTo(address(this), _amount); 
            }else if(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_assetC) == true){
                 _baseBorrow = iUTILS(_DAO().UTILS()).calcAsymmetricValueBase(_assetC, collateralAdjusted);// calc units to BASE
                iBASE(_assetC).transferTo(address(this), _amount); 
            }else if(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(_assetC) == true){
                _baseBorrow = iUTILS(_DAO().UTILS()).calcSwapValueInBaseWithSYNTH(_assetC, collateralAdjusted);
                iBASE(_assetC).transferTo(address(this), _amount); 
            }else{
                 return (0,0);
            }
             _actual = iBEP20(_assetC).balanceOf(address(this))-startBal;
        }
        return (_actual, _baseBorrow);
    }

    
    function _payInterest(address _assetC, uint256 _percentAmount, address _assetD) internal returns (uint _InterestAmount){
        address _assetDPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(_assetD);   
            if(_assetC == BASE){
                _InterestAmount = _percentAmount;
                _decrCDP(_InterestAmount,_assetC, iUTILS(_DAO().UTILS()).calcSwapValueInToken(_assetD,_InterestAmount), _assetD); 
                iBEP20(BASE).transfer(_assetDPool, _InterestAmount); 
            }else if(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(_assetC) == true){ 
                address token = iPOOL(_assetC).TOKEN();  
                iBEP20(_assetC).transfer(_assetC, _percentAmount);
                 (uint outputBase, uint outputToken) = iPOOL(_assetC).removeLiquidity(); 
                 iBEP20(token).approve(address(_DAO().ROUTER()),outputToken);
                 uint baseAmount = iROUTER(_DAO().ROUTER()).swap(outputToken, token, BASE);
                  _InterestAmount = baseAmount+outputBase;
                  _decrCDP(_percentAmount,_assetC, iUTILS(_DAO().UTILS()).calcSwapValueInToken(_assetD,_InterestAmount), _assetD); 
                 iBEP20(BASE).transfer(_assetDPool, _InterestAmount); 
            }else if(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(_assetC) == true){
                 iBEP20(_assetC).approve(address(_DAO().ROUTER()),_percentAmount);
                  _InterestAmount = iROUTER(_DAO().ROUTER()).swapSynthToBase(_percentAmount,_assetC);  
                 _decrCDP(_percentAmount,_assetC, iUTILS(_DAO().UTILS()).calcSwapValueInToken(_assetD,_InterestAmount), _assetD); 
                 iBEP20(BASE).transfer(_assetDPool, _InterestAmount); 
            } 
            iPOOL(_assetDPool).sync();
            return _InterestAmount;
    }
    function _incrMemberDetails(uint _actualInputAssetC,address _assetC, address _member, uint _assetDebtIssued, address _assetD) internal {
       mapMember_Details[_member].mapMember_Debt[_assetC].assetDebt[_assetD] += _assetDebtIssued;
       mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateral[_assetD] += _actualInputAssetC;
       mapMember_Details[_member].mapMember_Debt[_assetC].timeBorrowed[_assetD] = block.timestamp;
       mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateralDeposit[_assetD] += _actualInputAssetC;
    }
    function _decrMemberDetails(uint _assetCOutput, address _assetC, address _member, uint _debtRepaid, address _assetD) internal {
       mapMember_Details[_member].mapMember_Debt[_assetC].assetDebt[_assetD] -= _debtRepaid;
       mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateral[_assetD] -= _assetCOutput;
    }
    function _incrCDP(uint _inputCollateral,address _assetC, uint _assetDebtOutput, address _assetD) internal  {
         mapAddress_totalDebt[_assetC][_assetD] += _assetDebtOutput;
         mapAddress_totalCollateral[_assetC][_assetD] += _inputCollateral;
    }
    function _decrCDP(uint _outputCollateral,address _assetC, uint _assetDebtInput, address _assetD) internal  {
        mapAddress_totalDebt[_assetC][_assetD] -=_assetDebtInput;
        mapAddress_totalCollateral[_assetC][_assetD] -= _outputCollateral;
    }
    function addToReserve(uint amount) external{
        uint256 _actual;
       if(amount > 0) {
                uint startBal = iBEP20(BASE).balanceOf(address(this));
                iBASE(BASE).transferTo(address(this), amount); 
               _actual = iBEP20(BASE).balanceOf(address(this))-startBal;
       }
        reserve += _actual;
    }
  //===================================HELPERS===============================================
    function getMemberDetails(address member, address assetC, address assetD) public view returns (MemberDetails memory memberDetails){
        memberDetails.assetCurrentCollateral = iUTILS(_DAO().UTILS()).calcShare(mapAddress_totalCollateral[assetC][assetD], mapAddress_totalDebt[assetC][assetD], mapMember_Details[member].mapMember_Debt[assetC].assetDebt[assetD]);
        memberDetails.assetDebt = mapMember_Details[member].mapMember_Debt[assetC].assetDebt[assetD];
        memberDetails.timeBorrowed = mapMember_Details[member].mapMember_Debt[assetC].timeBorrowed[assetD];
        return memberDetails;
    }
   

    function destroyMe() public onlyDAO returns(bool){
         selfdestruct(payable(msg.sender));
        return true;
    }

    

}