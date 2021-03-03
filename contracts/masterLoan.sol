// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import "@nomiclabs/buidler/console.sol";
import "./loanVault.sol";

contract SpartanLoan {

    using SafeMath for uint256;
    address public BASE;
    address public DEPLOYER;
    address public WBNB;

    event AddCollateral(uint inputLPToken, address lpToken, address loanAsset, uint loanedAssetAmount);
    event RemoveCollateral(uint outPutLPToken, address lpToken, address loanAsset, uint loanAssetDeleted);

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _; 
    }

    constructor (address _base, address _wbnb) public payable {
        BASE = _base;
        WBNB = _wbnb;
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
    function addCollateral(uint inputLPToken, address lpToken, address loanAsset) public payable returns (uint loanAssets) {
        loanAssets = addCollateralForMember(inputLPToken, lpToken, msg.sender, loanAsset);
        return loanAssets;
    }
    // Add collateral for member
    function addCollateralForMember(uint inputLPToken, address lpToken, address member, address loanAsset) public payable returns (uint loanedAssetAmount) {
        require(iASSETCURATION(_DAO().ASSETCURATION()).isCuratedPool(lpToken) == true, "LP tokens must be from Curated pools");
        address _loanPool = iASSETCURATION(_DAO().ASSETCURATION()).getPool(loanAsset);
        require(iASSETCURATION(_DAO().ASSETCURATION()).isCuratedPool(_loanPool) == true, "Asset Loan from Curated pools");
        _handleLPTransfer(lpToken, inputLPToken, member, loanAsset); 
        loanedAssetAmount = SpartanLoanVault(loanAsset).addCollateralForMember(lpToken, member); 
        emit AddCollateral(inputLPToken, lpToken, loanAsset, loanedAssetAmount);
        return loanedAssetAmount;
    }

    function removeCollateral(uint inputAmount, address lpToken,address loanAsset) public returns (uint lpCollateral){
        (lpCollateral) = removeCollateralForMember(inputAmount,lpToken, msg.sender, loanAsset);
        return (lpCollateral);
    }
    function removeCollateralForMember(uint inputDebt, address lpToken, address member, address loanAsset) public returns (uint lpCollateral){

        require((inputDebt > 0), "InputErr"); uint loanAssetBurnt;
        // SpartanLoanVault(loanAsset).transferTo(loanAsset, inputDebt);
        (lpCollateral, loanAssetBurnt) = SpartanLoanVault(loanAsset).removeCollateralForMember(lpToken, member);
        emit RemoveCollateral(lpCollateral, lpToken, loanAsset, loanAssetBurnt);
        return (lpCollateral);
    }

    // handle input LP transfers 
    function _handleLPTransfer(address _lptoken, uint256 _amount, address member,  address _loanAsset) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_lptoken).balanceOf(_loanAsset);
                    iBEP20(_lptoken).transferFrom(member, _loanAsset, _amount); 
                actual = iBEP20(_lptoken).balanceOf(_loanAsset).sub(startBal);
        }
    }

    function destroyMe() public onlyDAO returns(bool){
         selfdestruct(msg.sender);
        return true;
    }

    

}