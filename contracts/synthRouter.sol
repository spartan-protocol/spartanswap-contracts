// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./IContracts.sol";
import "@nomiclabs/buidler/console.sol";
import "./synthFactory.sol";
contract synthRouter {

    using SafeMath for uint256;
    address public BASE;
    address public DEPLOYER;
    address public WBNB;

    address[] public arraySynths;

    mapping(address => address) private mapToken_Synth;
    mapping(address => bool) public isSynth;

    event NewSynth(address token, address pool, uint genesis);
    event SwapToSynth(address token, uint inputToken, address toSynth, uint outPutSynth);
    event SwapSynthToSynth(address synth, uint inputAmount, address toSynth, uint outPutSynth);
    event SwapFromSynth(address synth, uint inputSynth, address toToken, uint outPutToken);
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

    // In case of new synthRouter can migrate metrics
    function migrateSynthRouterData(address payable oldSynthRouter) public onlyDAO {
 
    }

    function migrateSynthTokenData(address payable oldSynthRouter) public onlyDAO {

    }

    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }
    //Create a synth asset - only from curated pools
    function createSynth(address lpToken, address token, uint256 inputLPToken) public returns(address synth){
        require(getSynth(token) == address(0), "CreateErr");
        require(lpToken != BASE, "Must not be Base");
        require(inputLPToken > 0, "Must get lp token");
        require(iROUTER(_DAO().ROUTER()).isCuratedPool(lpToken) == true, "Must be Curated");
        Synth newSynth; 
        newSynth = new Synth(BASE,token);  
        synth = address(newSynth);
        _handleLPTransfer(lpToken, inputLPToken, msg.sender, synth);
        mapToken_Synth[token] = synth;
        arraySynths.push(synth); 
        isSynth[synth] = true;
        Synth(synth).addCollateralForMember(lpToken, msg.sender);
        emit NewSynth(token, synth, now);
        return synth;
        }

    // Add collateral for self
    function addCollateral(uint inputLPToken, address lpToken, address synth) public payable returns (uint synths) {
        synths = addCollateralForMember(inputLPToken, lpToken, msg.sender, synth);
        return synths;
    }
    // Add collateral for member
    function addCollateralForMember(uint inputLPToken, address lpToken, address member, address synth) public payable returns (uint synthMinted) {
        require(isSynth[synth] == true, "Synth must exist");
        require(iROUTER(_DAO().ROUTER()).isCuratedPool(lpToken) == true, "LP tokens must be from Curated pools");
        _handleLPTransfer(lpToken, inputLPToken, member, synth);
        synthMinted = Synth(synth).addCollateralForMember(lpToken, member);
        emit AddCollateral(inputLPToken, lpToken, synth, synthMinted);
        return synthMinted;
    }

    function removeCollateral(uint inputAmount, address lpToken,address synth) public returns (uint lpCollateral){
        (lpCollateral) = removeCollateralForMember(inputAmount,lpToken, msg.sender, synth);
        return (lpCollateral);
    }
    function removeCollateralForMember(uint inputSynth, address lpToken, address member, address synth) public returns (uint lpCollateral){
        require(isSynth[synth] == true, "Synth must exist");
        require((inputSynth > 0), "InputErr"); uint synthBurnt;
        Synth(synth).transferTo(synth, inputSynth);
        (lpCollateral, synthBurnt) = Synth(synth).removeCollateralForMember(lpToken, member);
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

    function changeLiquidationFactor(address synth, uint liqFactor) public onlyDAO {
        require(isSynth[synth] == true, "!SYNTH");
        Synth(synth).changeLiqFactor(liqFactor); 
    }
    
    function getSynth(address token) public view returns(address synth){
        return mapToken_Synth[token];
    }

    function globalSettlement(address synth) public onlyDAO returns(bool){
        require(isSynth[synth] == true, "!SYNTH");
         Synth(synth).globalSettleMent();
         if(Synth(synth).totalMinted() == 0){
             isSynth[synth] == false;
         }
        return true;
    }
    
    

    
    //=================================onlyDAO=====================================//


    //======================================HELPERS========================================//
 
}