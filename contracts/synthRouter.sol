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

    mapping(address => mapping(address => uint)) public totalCDPCollateral;
    mapping(address => uint) public totalCDPDebt;
    mapping(address => address) private mapToken_Synth;
    mapping(address => bool) public isSynth;

    event NewSynth(address token, address pool, uint genesis);
    event SwapToSynth(address token, uint inputToken, address toSynth, uint outPutSynth);
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
        uint actualInputCollateral = _handleLPTransfer(lpToken, inputLPToken, msg.sender, synth);
        totalCDPCollateral[lpToken][synth] = totalCDPCollateral[lpToken][synth].add(actualInputCollateral);
        mapToken_Synth[token] = synth;
        arraySynths.push(synth); 
        isSynth[synth] = true;
        uint synthMinted = Synth(synth).addCollateralForMember(lpToken, msg.sender);
        totalCDPDebt[synth]= totalCDPDebt[synth].add(synthMinted);
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
        uint _actualInputCollateral = _handleLPTransfer(lpToken, inputLPToken, member, synth);
        totalCDPCollateral[lpToken][synth] = totalCDPCollateral[lpToken][synth].add(_actualInputCollateral);
        synthMinted = Synth(synth).addCollateralForMember(lpToken, member);
        totalCDPDebt[synth]= totalCDPDebt[synth].add(synthMinted);
        emit AddCollateral(inputLPToken, lpToken, synth, synthMinted);
        return synthMinted;
    }

    function removeCollateral(address lpToken, uint basisPoints,address synth) public returns (uint lpCollateral){
        (lpCollateral) = removeCollateralForMember(lpToken, basisPoints, msg.sender, synth);
        return (lpCollateral);
    }
    function removeCollateralForMember(address lpToken, uint basisPoints, address member, address synth) public returns (uint lpCollateral){
        require(isSynth[synth] == true, "Synth must exist");
        require(iROUTER(_DAO().ROUTER()).isCuratedPool(lpToken) == true, "LP tokens must be from Curated pools");
        require((basisPoints > 0 && basisPoints <= 10000), "InputErr"); uint synthBurnt;
        uint _synths = iUTILS(_DAO().UTILS()).calcPart(basisPoints, iBEP20(synth).balanceOf(member));
        if(member!= address(this)){Synth(synth).transferTo(synth, _synths); }else{iBEP20(synth).transfer(synth, _synths); }
        (lpCollateral, synthBurnt) = Synth(synth).removeCollateralForMember(lpToken, member);
        totalCDPCollateral[lpToken][synth] = totalCDPCollateral[lpToken][synth].sub(lpCollateral);
        totalCDPDebt[synth]= totalCDPDebt[synth].sub(synthBurnt);
        emit RemoveCollateral(lpCollateral, lpToken, synth, synthBurnt);
        return (lpCollateral);
    }

    function swapSynth(uint inputToken, address fromToken, address toToken) public returns (uint amount ){
        address synth; 
        if(isSynth[toToken]==true){
            amount = swapLayerOneToSynth(inputToken, fromToken, toToken);
        }else{
            require(isSynth[fromToken]==true,'SYNTHERR');
            amount = swapSynthToLayerOne(inputToken,fromToken, toToken);
        }
        return amount;
    }

    function swapLayerOneToSynth(uint inputToken, address token, address synth) internal returns (uint amount){
        require(isSynth[synth] == true, "!SYNTH");
        _handleTransferIn(token, inputToken);
        uint lpUnits; address pool;
        if(token == BASE){
           address _token = Synth(synth).LayerONE();
           iBEP20(_token).approve(_DAO().ROUTER(),inputToken);
           lpUnits = iROUTER(_DAO().ROUTER()).addLiquidityAsym(inputToken, false, _token);
           pool = iUTILS(_DAO().UTILS()).getPool(_token);
        }else{
           iBEP20(token).approve(_DAO().ROUTER(),inputToken);
           lpUnits = iROUTER(_DAO().ROUTER()).addLiquidityAsym(inputToken, true, token);
           pool = iUTILS(_DAO().UTILS()).getPool(token);
        }
         amount = addCollateralForMember(lpUnits,pool,address(this),synth);
        _handleTransferOut(synth,amount,msg.sender);
         emit SwapToSynth(token, inputToken, synth, amount);
         return amount;
    }

    function swapSynthToLayerOne(uint inputSynth, address synth, address token) internal returns (uint amount){
          require(isSynth[synth] == true, "!SYNTH"); address pool;uint lpCollateral; 
          _handleTransferIn(synth, inputSynth);
          if(token == BASE){
              address _token = Synth(synth).LayerONE();
              pool = iUTILS(_DAO().UTILS()).getPool(_token);
              lpCollateral = removeCollateralForMember(pool, 10000, address(this), synth );
              amount = iROUTER(_DAO().ROUTER()).removeLiquidityAsym(lpCollateral, true, _token); 
          }else{
              pool = iUTILS(_DAO().UTILS()).getPool(token);
              lpCollateral = removeCollateralForMember(pool, 10000, address(this), synth);
              amount = iROUTER(_DAO().ROUTER()).removeLiquidityAsym(lpCollateral, false, token); 
          }
          _handleTransferOut(token,amount,msg.sender); 
          emit SwapFromSynth(synth, inputSynth, token, amount);
          return amount;
    }

    // handle input LP transfers 
    function _handleLPTransfer(address _lptoken, uint256 _amount, address member,  address _synth) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_lptoken).balanceOf(_synth);
                if(member!= address(this)){
                    iBEP20(_lptoken).transferFrom(member, _synth, _amount); 
                }else{
                    iBEP20(_lptoken).transfer(_synth, _amount); 
                }
                actual = iBEP20(_lptoken).balanceOf(_synth).sub(startBal);
        }
    }
    function _handleTransferIn(address _token, uint256 _amount) internal returns (uint256 actual){
        if(_amount > 0) {
            uint startBal = iBEP20(_token).balanceOf(address(this));
            if(_token == address(0)){
                // If BNB, then send to WBNB contract, then forward WBNB to synth
                require((_amount == msg.value), "InputErr");
                payable(WBNB).call{value:_amount}(""); 
               iBEP20(WBNB).transfer(address(this), _amount); 
            } else {
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount); 
            }
              actual = iBEP20(_token).balanceOf(address(this)).sub(startBal);
        }
        return actual;
    }
    function _handleTransferOut(address _token, uint256 _amount, address _recipient) internal {
        if(_amount > 0) {
            if (_token == address(0)) {
                // If BNB, then withdraw to BNB, then forward BNB to recipient
                iWBNB(WBNB).withdraw(_amount);
                payable(_recipient).call{value:_amount}(""); 
            } else {
                iBEP20(_token).transfer(_recipient, _amount);
            }
        }
    }

     function approveSynthRouter() public returns (bool){
       uint256 baseSupply = iBEP20(BASE).totalSupply();
        iBEP20(BASE).approve(_DAO().ROUTER(), baseSupply);
        return true;
    }

    
    function getSynth(address token) public view returns(address synth){
        return mapToken_Synth[token];
    }

    function globalSettleMent() public returns(bool){

    }

    
    //=================================onlyDAO=====================================//


    //======================================HELPERS========================================//
 
}