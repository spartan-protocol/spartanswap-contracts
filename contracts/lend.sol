// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import "@nomiclabs/buidler/console.sol";
import "./lendRouter.sol";

contract SpartanLend {

    using SafeMath for uint256;
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
    mapping(address => mapping(address => uint)) public totalCollateral;
    mapping(address => mapping(address => uint)) public totalDebt;
    mapping(address => mapping(address => uint)) public TimeLoaned;
    mapping(address => bool) public isDebtAsset;
    mapping(address => bool) public isCollateralAsset;

    event AddCollateral(uint inputToken, address indexed Debt, uint DebtIssued);
    event RemoveCollateral(uint inputToken, address indexed Debt, uint DebtReturned);
    event InterestPaid(address indexed Collateral, uint Interest, address indexed DebtPool);

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _; 
    }

    constructor (address _base, address _lendRouter) public payable {
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

    receive() external payable {}

    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }
 
    // Add collateral for self
    function drawDebt(uint amount, address assetC, address assetD) public payable returns (uint assetDebt) {
        assetDebt = drawDebtForMember(amount, assetC, assetD,msg.sender);
        return assetDebt;
    }
    // Add collateral for member
    function drawDebtForMember(uint _amount, address _assetC, address _assetD, address _member) public payable returns (uint256 _assetDebtIssued) {
        (uint actualInputAssetC, uint baseBorrow) = _handleTransferInCol(_amount,_assetC);
        require(baseBorrow <= reserve,'!Reserve');
        if(totalDebt[_assetC][_assetD] == 0){
            TimeLoaned[_assetC][_assetD] = block.timestamp;
        }
        if(isDebtAsset[_assetD] == false){
            debtAssets.push(_assetD);
            isDebtAsset[_assetD] = true;
        }
        if(isCollateralAsset[_assetC] == false){
            isCollateralAsset[_assetC] = true;
        }
        reserve = reserve.sub(baseBorrow);
        iBEP20(BASE).transfer(LENDROUTER,baseBorrow);
        _assetDebtIssued = LendRouter(LENDROUTER).depositForMember(_assetD);
        _incrCDP(actualInputAssetC,_assetC, _assetDebtIssued, _assetD);
        _incrMemberDetails(actualInputAssetC,_assetC, _member, _assetDebtIssued, _assetD); //update member details
        iBEP20(_assetD).transfer(_member, _assetDebtIssued);
        emit AddCollateral(_amount, _assetD, _assetDebtIssued);
        return _assetDebtIssued;
    }


    // Remove collateral for self
    function repayDebt(uint amount, address assetC, address assetD) public returns (uint _assetCollateralRemoved){
        _assetCollateralRemoved = repayDebtForMember(amount, assetC, assetD, msg.sender);
        return _assetCollateralRemoved;
    }
     // Remove collateral for member
    function repayDebtForMember(uint _amount,address _assetC, address _assetD, address _member) public returns (uint _assetCollateralRemoved){
         require(block.timestamp >= mapMember_Details[_member].mapMember_Debt[_assetC].timeBorrowed[_assetD].add(OneHR));// min 1hr withdraw period 
         require(totalCollateral[_assetC][_assetD] > 0, 'PURGED');
         require(totalDebt[_assetC][_assetD] >= _amount, 'INPUTERR');
         uint actualInputAssetD = _handleTransferInDebt(_assetD, _amount, _member); 
         uint baseReturned = LendRouter(LENDROUTER).removeForMember(_assetD);
         reserve = reserve.add(baseReturned);
          _assetCollateralRemoved = iUTILS(_DAO().UTILS()).calcShare(totalCollateral[_assetC][_assetD], totalDebt[_assetC][_assetD], actualInputAssetD);
          _decrCDP(_assetCollateralRemoved,_assetC, actualInputAssetD, _assetD);
         _decrMemberDetails(_assetCollateralRemoved, _assetC, _member, actualInputAssetD, _assetD);
         iBEP20(_assetC).transfer(_member, _assetCollateralRemoved);
        if(totalDebt[_assetC][_assetD] == 0){
            TimeLoaned[_assetC][_assetD] = 0;
        }
        emit RemoveCollateral(_assetCollateralRemoved, _assetD, actualInputAssetD);
        return (_assetCollateralRemoved);
    }


    function calcInterestAmount(address assetC, address assetD) internal view returns (uint){
        address _assetDPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(assetD); 
        uint poolDepth = iPOOL(_assetDPool).tokenAmount();
        //    console.log("Pool Depth",poolDepth/10**18);
        // uint poolDepthBase = iPOOL(_assetDPool).baseAmount();
        //    console.log("Pool Depth Base",poolDepthBase/10**18);
        uint poolDebt = totalDebt[assetC][assetD];
        //   console.log("Pool debt",poolDebt/10**18);
        uint interest = poolDebt.mul(10**18).div(poolDepth);
        //   console.log("interest %",interest);
        return interest;
    }

     function checkInterest(address assetC) public {
         uint256 interest = 0; 
        if(isCollateralAsset[assetC] == true){
         for(uint i = 0; i<debtAssets.length; i++){
            if(block.timestamp >= TimeLoaned[assetC][debtAssets[i]].add(OneDAY)){
                 uint256 _interestPayable = calcInterestAmount(assetC, debtAssets[i]); 
                 uint256 _IR = _interestPayable.div(365).mul(1);//per day
                //   console.log("IR", _IR); 
                 uint256 _percentAmount = totalCollateral[assetC][debtAssets[i]].mul(_IR).div(10**18);     
                 // console.log("_percentAmount_", _percentAmount);   
                 TimeLoaned[assetC][debtAssets[i]] = block.timestamp;                 
                 interest = _payInterest(assetC, _percentAmount, debtAssets[i]);  
                 // console.log("interest--", interest); 
                  _checkPurge(assetC, interest,debtAssets[i]);
                 
                 emit InterestPaid(assetC,interest, debtAssets[i]);    
             }
           }  
         }                                                                                                      
    }

    function checkliquidate(address assetC) public returns (uint fee){
        uint baseCollateral; uint baseDebt; 
         if(isCollateralAsset[assetC] == true){
         for(uint i = 0; i<debtAssets.length; i++){
            baseCollateral = getBaseValue(assetC, debtAssets[i]);
            baseDebt = iUTILS(_DAO().UTILS()).calcSwapValueInBase(debtAssets[i], totalDebt[assetC][debtAssets[i]]);
            // console.log("baseDebt",baseDebt/10**18);
            // console.log("baseColl",baseCollateral/10**18);
            if(baseCollateral <= baseDebt){
                _payInterest(assetC,totalCollateral[assetC][debtAssets[i]].mul(500).div(10000), debtAssets[i]);//10%
               _fee(baseCollateral.mul(100).div(10000));
               console.log("liquidated, ",totalCollateral[assetC][debtAssets[i]].mul(500).div(10000));
            }   
            }
        }  
        return fee;
    }

    function _fee(uint fee) internal returns (bool){
        if(reserve <= fee){
                iBEP20(BASE).transfer(msg.sender, reserve);//send reserve to caller
                reserve = 0;
             }else{
                iBEP20(BASE).transfer(msg.sender, fee);//send fee to caller 
                reserve = reserve.sub(fee);
         }
         return true;
    }
    
    function getBaseValue(address assetC, address assetD) internal view returns (uint){
         uint baseCollateral; 
        if(assetC == BASE){
               baseCollateral = totalCollateral[assetC][assetD];
             }else if(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(assetC) == true){   
               baseCollateral = iUTILS(_DAO().UTILS()).calcAsymmetricValueBase(assetC, totalCollateral[assetC][assetD]);
             }else if(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(assetC) == true){
               baseCollateral = iUTILS(_DAO().UTILS()).calcSwapValueInBaseWithSYNTH(assetC, totalCollateral[assetC][assetD]); 
            }
        return baseCollateral;
    }

    function _checkPurge(address assetC, uint _interestBase, address assetD) internal returns (uint){
        uint baseCollateral = getBaseValue(assetC,assetD);
        if(baseCollateral <= _interestBase){
            _fee(baseCollateral.mul(100).div(10000));
            _payInterest(assetC,totalCollateral[assetC][assetD], assetD);//100%
            totalDebt[assetC][assetD] = 0;
            totalCollateral[assetC][assetD] = 0;
           
        }
    }

    // handle input LP transfers 
    function _handleTransferInDebt(address _assetC, uint256 _amount, address _member) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_assetC).balanceOf(LENDROUTER);
                    iBEP20(_assetC).transferFrom(_member, LENDROUTER, _amount); 
                actual = iBEP20(_assetC).balanceOf(LENDROUTER).sub(startBal);
        }
        return actual;
    }
    function _handleTransferInCol( uint256 _amount, address _assetC) internal returns(uint256 actual, uint baseBorrow){
        if(_amount > 0) {
                uint collateralAdjusted = _amount.mul(6666).div(10000); //150% collateral Ratio
                uint startBal = iBEP20(_assetC).balanceOf(address(this));
            if(_assetC == BASE){
                baseBorrow = collateralAdjusted;
                iBASE(_assetC).transferTo(address(this), _amount); 
            }else if(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_assetC) == true){
                 baseBorrow = iUTILS(_DAO().UTILS()).calcAsymmetricValueBase(_assetC, collateralAdjusted);// calc units to BASE
                iPOOL(_assetC).transferTo(address(this), _amount); 
            }else if(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(_assetC) == true){
                baseBorrow = iUTILS(_DAO().UTILS()).calcSwapValueInBaseWithSYNTH(_assetC, collateralAdjusted);
                iSYNTH(_assetC).transferTo(address(this), _amount); 
            }else{
                 return (0,0);
            }
             actual = iBEP20(_assetC).balanceOf(address(this)).sub(startBal);
        }
        return (actual, baseBorrow);
    }
    function _payInterest(address _assetC, uint256 _percentAmount, address _assetD) internal returns (uint InterestAmount){
        address _assetDPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(_assetD);   
            if(_assetC == BASE){
                InterestAmount = _percentAmount;
                _decrCDP(InterestAmount,_assetC, iUTILS(_DAO().UTILS()).calcSwapValueInToken(_assetD,InterestAmount), _assetD); 
                iBEP20(BASE).transfer(_assetDPool, InterestAmount); 
            }else if(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(_assetC) == true){ 
                address token = iPOOL(_assetC).TOKEN();  
                iBEP20(_assetC).transfer(_assetC, _percentAmount);
                 (uint outputBase, uint outputToken) = iPOOL(_assetC).removeLiquidity(); 
                 iBEP20(token).approve(address(_DAO().ROUTER()),outputToken);
                 uint baseAmount = iROUTER(_DAO().ROUTER()).swap(outputToken, token, BASE);
                  InterestAmount = baseAmount.add(outputBase);
                  _decrCDP(_percentAmount,_assetC, iUTILS(_DAO().UTILS()).calcSwapValueInToken(_assetD,InterestAmount), _assetD); 
                 iBEP20(BASE).transfer(_assetDPool, InterestAmount); 
            }else if(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(_assetC) == true){
                 iBEP20(_assetC).approve(address(_DAO().ROUTER()),_percentAmount);
                  InterestAmount = iROUTER(_DAO().ROUTER()).swapSynthToBase(_percentAmount,_assetC);  
                 _decrCDP(_percentAmount,_assetC, iUTILS(_DAO().UTILS()).calcSwapValueInToken(_assetD,InterestAmount), _assetD); 
                 iBEP20(BASE).transfer(_assetDPool, InterestAmount); 
            } 
            iPOOL(_assetDPool).sync();
            return InterestAmount;
    }
    function _incrMemberDetails(uint actualInputAssetC,address _assetC, address _member, uint _assetDebtIssued, address _assetD) internal {
       mapMember_Details[_member].mapMember_Debt[_assetC].assetDebt[_assetD] = mapMember_Details[_member].mapMember_Debt[_assetC].assetDebt[_assetD].add(_assetDebtIssued);
       mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateral[_assetD] = mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateral[_assetD].add(actualInputAssetC);
       mapMember_Details[_member].mapMember_Debt[_assetC].timeBorrowed[_assetD] = block.timestamp;
       mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateralDeposit[_assetD] = mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateralDeposit[_assetD].add(actualInputAssetC);
    }
    function _decrMemberDetails(uint _assetCOutput, address _assetC, address _member, uint debtRepaid, address _assetD) internal {
       mapMember_Details[_member].mapMember_Debt[_assetC].assetDebt[_assetD] = mapMember_Details[_member].mapMember_Debt[_assetC].assetDebt[_assetD].sub(debtRepaid);
       mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateral[_assetD] = mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateral[_assetD].sub(_assetCOutput);
    }
    function _incrCDP(uint _inputCollateral,address _assetC, uint _assetDebtOutput, address _assetD) internal  {
         totalDebt[_assetC][_assetD] = totalDebt[_assetC][_assetD].add(_assetDebtOutput);
         totalCollateral[_assetC][_assetD] = totalCollateral[_assetC][_assetD].add(_inputCollateral);
    }
    function _decrCDP(uint _outputCollateral,address _assetC, uint _assetDebtInput, address _assetD) internal  {
        totalDebt[_assetC][_assetD] = totalDebt[_assetC][_assetD].sub(_assetDebtInput);
        totalCollateral[_assetC][_assetD] = totalCollateral[_assetC][_assetD].sub(_outputCollateral);
    }
    function addToReserve(uint amount) public{
        require(iBASE(BASE).transferTo(address(this), amount));
        reserve = reserve.add(amount);
    }
  //===================================HELPERS===============================================
    function getMemberDetails(address member, address assetC, address assetD) public view returns (MemberDetails memory memberDetails){
        memberDetails.assetCurrentCollateral = iUTILS(_DAO().UTILS()).calcShare(totalCollateral[assetC][assetD], totalDebt[assetC][assetD], mapMember_Details[member].mapMember_Debt[assetC].assetDebt[assetD]);
        memberDetails.assetDebt = mapMember_Details[member].mapMember_Debt[assetC].assetDebt[assetD];
        memberDetails.timeBorrowed = mapMember_Details[member].mapMember_Debt[assetC].timeBorrowed[assetD];
        return memberDetails;
    }
   

    function destroyMe() public onlyDAO returns(bool){
         selfdestruct(msg.sender);
        return true;
    }

    

}