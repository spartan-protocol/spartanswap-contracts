// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import "@nomiclabs/buidler/console.sol";
import "./lendRouter.sol";

contract SpartanLend {

    using SafeMath for uint256;
    address public BASE;
    address public DEPLOYER;
    address public WBNB;
    address public LENDROUTER;
    uint public nextDayTime;
    uint public currentDay;

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
        // mapping(address =>uint256) nextDayTime; // assetC > AssetD > time
    }
    mapping(address => CollateralDetails) private mapMember_Details;
    mapping(address => mapping(address => uint)) public totalCollateral;
    mapping(address => mapping(address => uint)) public totalDebt;

    event AddCollateral(uint inputToken, address Debt, uint DebtIssued);
    event RemoveCollateral(uint inputToken, address Debt, uint DebtReturned);

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _; 
    }

    constructor (address _base, address _wbnb, address _lendRouter) public payable {
        BASE = _base;
        WBNB = _wbnb;
        LENDROUTER = _lendRouter;
        DEPLOYER = msg.sender;
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
        uint actualInputAssetC = _handleTransferIn(_assetC, _amount, _member); 
        uint collateralAdjusted = actualInputAssetC.mul(6666).div(10000); //150% collateral Ratio
        uint baseBorrow;
        if(_assetC == BASE){
            baseBorrow = collateralAdjusted;
        }else if(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_assetC) == true){
            baseBorrow = iUTILS(_DAO().UTILS()).calcAsymmetricValueBase(_assetC, collateralAdjusted);// calc units to BASE
        }else if(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(_assetC) == true){
            baseBorrow = iUTILS(_DAO().UTILS()).calcSwapValueInBaseWithSYNTH(_assetC, collateralAdjusted);
        }else{
            return 0;
        }
        require(baseBorrow < iBEP20(BASE).balanceOf(address(this)));
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
         require(block.timestamp >= mapMember_Details[_member].mapMember_Debt[_assetC].timeBorrowed[_assetD].add(3600));// min 1hr withdraw period 
         require(mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateral[_assetD] > 0, 'MEMBERPURGED');
         require(mapMember_Details[_member].mapMember_Debt[_assetC].assetDebt[_assetD] <= _amount, 'INPUTERR');
         uint actualInputAssetD = _handleTransferIn(_assetD, _amount, _member); 
         uint debtRepaid = LendRouter(LENDROUTER).removeForMember(_assetD);
          _assetCollateralRemoved = iUTILS(_DAO().UTILS()).calcShare(actualInputAssetD,mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateral[_assetD], mapMember_Details[_member].mapMember_Debt[_assetC].assetDebt[_assetD]);
          _decrCDP(_assetCollateralRemoved,_assetC, debtRepaid, _assetD);
         _decrMemberDetails(_assetCollateralRemoved, _assetC, _member, debtRepaid, _assetD);
         iBEP20(_assetC).transfer(_member, _assetCollateralRemoved);
        emit RemoveCollateral(_assetCollateralRemoved, _assetD, debtRepaid);
        return (_assetCollateralRemoved);
    }

    function purgeCDP() public returns(uint fee){

    }

    function _interestPayment() internal returns (uint interestPaid){

    }
    function calcInterestAmount() internal returns (uint){

    }

     function _checkInterest() private {
        if (block.timestamp >= nextDayTime) {                                          
            nextDayTime = block.timestamp + 86400;                                           
            uint256 _interestPayable = calcInterestAmount();                               
             _interestPayment();                            
            //emit InterestPaid();                              
        }
    }
    // handle input LP transfers 
    function _handleTransferIn(address _assetC, uint256 _amount, address _member) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_assetC).balanceOf(address(this));
                    iBEP20(_assetC).transferFrom(_member, address(this), _amount); 
                actual = iBEP20(_assetC).balanceOf(address(this)).sub(startBal);
        }
        return actual;
    }

    function _incrMemberDetails(uint actualInputAssetC,address _assetC, address _member, uint _assetDebtIssued, address _assetD) internal {
       mapMember_Details[_member].mapMember_Debt[_assetC].assetDebt[_assetD] = mapMember_Details[_member].mapMember_Debt[_assetC].assetDebt[_assetD].add(_assetDebtIssued);
       mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateral[_assetD] = mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateral[_assetD].add(actualInputAssetC);
       mapMember_Details[_member].mapMember_Debt[_assetC].timeBorrowed[_assetD] = block.timestamp;
       mapMember_Details[_member].mapMember_Debt[_assetC].assetCollateralDeposit[_assetD] = actualInputAssetC;
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

  //===================================HELPERS===============================================
    // function getMemberDetails(address member, address assetD) public view returns (uint MemberDebt){
    //     MemberDebt = mapMember_Details[member].assetDebt[assetD];
    //     return MemberDebt;
    // }

    function destroyMe() public onlyDAO returns(bool){
         selfdestruct(msg.sender);
        return true;
    }

    

}