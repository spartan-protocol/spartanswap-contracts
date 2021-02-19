// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "@nomiclabs/buidler/console.sol";
import "./loanVault.sol";

contract SpartanLoan {

    using SafeMath for uint256;
    address public BASE;
    address public DEPLOYER;
    address public WBNB;

    event AddCollateral(uint inputLPToken, address lpToken, address synth, uint synthMinted);
    event RemoveCollateral(uint outPutLPToken, address lpToken, address synth, uint synthDeleted);

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
    function addCollateral(uint inputLPToken, address lpToken, address synth) public payable returns (uint synths) {
        synths = addCollateralForMember(inputLPToken, lpToken, msg.sender, synth);
        return synths;
    }
    // Add collateral for member
    function addCollateralForMember(uint inputLPToken, address lpToken, address member, address synth) public payable returns (uint synthMinted) {
        require(iASSETCURATION(_DAO().ASSETCURATION()).isSynth(synth) == true, "Synth must exist");
        require(iASSETCURATION(_DAO().ASSETCURATION()).isCuratedPool(lpToken) == true, "LP tokens must be from Curated pools");
        _handleLPTransfer(lpToken, inputLPToken, member, synth); 
        synthMinted = SpartanLoanVault(synth).addCollateralForMember(lpToken, member); 
        emit AddCollateral(inputLPToken, lpToken, synth, synthMinted);
        return synthMinted;
    }

    function removeCollateral(uint inputAmount, address lpToken,address synth) public returns (uint lpCollateral){
        (lpCollateral) = removeCollateralForMember(inputAmount,lpToken, msg.sender, synth);
        return (lpCollateral);
    }
    function removeCollateralForMember(uint inputSynth, address lpToken, address member, address synth) public returns (uint lpCollateral){
        require(iASSETCURATION(_DAO().ASSETCURATION()).isSynth(synth) == true, "Synth must exist");
        require((inputSynth > 0), "InputErr"); uint synthBurnt;
        //SpartanLoanVault(synth).transferTo(synth, inputSynth);
        (lpCollateral, synthBurnt) = SpartanLoanVault(synth).removeCollateralForMember(lpToken, member);
        emit RemoveCollateral(lpCollateral, lpToken, synth, synthBurnt);
        return (lpCollateral);
    }

    // handle input LP transfers 
    function _handleLPTransfer(address _lptoken, uint256 _amount, address member,  address _synth) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_lptoken).balanceOf(_synth);
                    iBEP20(_lptoken).transferFrom(member, _synth, _amount); 
                actual = iBEP20(_lptoken).balanceOf(_synth).sub(startBal);
        }
    }

   
    function destroyMe() public onlyDAO returns(bool){
         selfdestruct(msg.sender);
        return true;
    }

    

    
    //=================================onlyDAO=====================================//


    //======================================HELPERS========================================//
 
}