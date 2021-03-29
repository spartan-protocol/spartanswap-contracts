// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import "./cInterfaces.sol";
import "@nomiclabs/buidler/console.sol";
interface iBASE {
    function DAO() external view returns (iDAO);
}
interface iROUTER {
    function swap(uint, address, address) external returns(uint);
    function removeLiquidityExact(uint, address) external returns(uint, uint);
}
interface iUTILS {
   function calcSwapValueInBaseWithPool(address pool, uint amount) external view returns (uint value);
    function calcAsymmetricValueBase(address token, uint units) external view returns(uint amount);
    function calcShare(uint units,uint total, uint amount ) external view returns (uint unitShare);
    function calcSwapValueInBaseWithSYNTH(address token, uint units) external view returns (uint amount);
    function calcSpotValueInBase(address token, uint units) external view returns (uint amount);
    function allCuratedPools() external view returns (address [] memory);
    function calcLiquidityUnitsAsym() external view returns (uint);
   
}
interface iDAO {
    function ROUTER() external view returns(address);
    function UTILS() external view returns(address);
    function DAO() external view returns (address);
    function LEND() external view returns (address);
    function POOLFACTORY() external view returns (address);
    function SYNTHFACTORY() external view returns (address);
   
}
interface iPOOL {
    function TOKEN() external view returns(address);
    function sync() external; 
}
interface iPOOLFACTORY {
    function isCuratedPool(address) external view returns (bool);
    function getPool(address) external view returns(address payable);
}
interface iSYNTHFACTORY {
    function isSynth(address) external view returns(bool);
}

contract LendRouter {
    using SafeMath for uint256;
    uint32 private membersActiveCount;
    address public BASE;
    address public DEPLOYER;
    address [] public membersActive;

    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;


   
    event Liquidated(address pool, uint units, uint outputAmount);
    event InterestPayment(address pool, uint units, uint outputAmount);

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }
     modifier onlyLEND() {
        require(msg.sender == DEPLOYER || msg.sender == _DAO().LEND());
        _;
    }

    constructor (address _base,address _token) public payable {
        BASE = _base;
        DEPLOYER = msg.sender;
    }
    
    // add collateral for member
    function depositForMember(address _assetD) public onlyLEND returns(uint256 _debtIssued){
        address _assetDPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(_assetD); 
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_assetDPool) == true, "!Curated"); // only curated pools 
        uint inputBASE = iBEP20(BASE).balanceOf(address(this));
        iBEP20(BASE).approve(address(_DAO().ROUTER()), inputBASE);
         _debtIssued = iROUTER(_DAO().ROUTER()).swap(inputBASE, BASE, _assetD);
        iBEP20(_assetD).transfer(msg.sender,_debtIssued);
        return _debtIssued;
    }

    // Remove Collateral for a member
    function removeForMember(address _assetD) public onlyLEND returns (uint256 DebtReturned) {
        uint inputDebt = iBEP20(_assetD).balanceOf(address(this));
        iBEP20(_assetD).approve(address(_DAO().ROUTER()), inputDebt);
        uint outputBase = iROUTER(_DAO().ROUTER()).swap(inputDebt, _assetD, BASE);
         iBEP20(BASE).transfer(msg.sender,outputBase);
        return  DebtReturned;
    }

    function _handleTransferIn(address _token, uint256 _amount) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_token).balanceOf(address(this)); 
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount); 
                actual = iBEP20(_token).balanceOf(address(this)).sub(startBal);
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
    //                 uint256 outputCollateral = iUTILS(_DAO().UTILS()).calcDebtShare(mapMember_Details[membersActive[x]].assetDebt[getCuratedPools[i]], totalDebt[getCuratedPools[i]], getCuratedPools[i], address(this)); 
    //                 totalMinted = totalMinted.sub(mapMember_Details[membersActive[x]].assetDebt[getCuratedPools[i]]); //map synthetic debt
    //                 _decrementCDPDebt(outputCollateral, mapMember_Details[membersActive[x]].assetDebt[getCuratedPools[i]], getCuratedPools[i] );
    //                 _decrementMemberDetails(getCuratedPools[i], membersActive[x], mapMember_Details[membersActive[x]].assetDebt[getCuratedPools[i]]); //update member details
    //                 iBEP20(getCuratedPools[i]).transfer(membersActive[x], outputCollateral); //return their collateral
    //                 emit RemoveCollateral(membersActive[x], outputCollateral, mapMember_Details[membersActive[x]].assetDebt[getCuratedPools[i]], getCuratedPools[i]);
    //             }
    //           }
    //           }
    //         totalMinted = 0;
    //         selfdestruct(msg.sender);
    // }
    // }
    function destroyMe() public onlyLEND {
        selfdestruct(msg.sender);
    } 

    function getMemberLength() public view returns (uint memberCount){
        memberCount = membersActive.length;
        return memberCount;
    }

}