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

    uint public addCollateralTx;

    address[] public arraySynths;

    mapping(address => mapping(address => uint)) public totalCDPCollateral;
    mapping(address => uint) public totalCDPDebt;
    mapping(address => address) private mapToken_Synth;
    mapping(address => bool) public isSynth;

    event NewSynth(address token, address pool, uint genesis);
    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _;
    }

    constructor (address _base) public payable {
        BASE = _base;
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
        uint actualInputCollateral = _handleTransferIn(lpToken, inputLPToken, synth);
        totalCDPCollateral[synth][lpToken] = totalCDPCollateral[lpToken][synth].add(actualInputCollateral);
        mapToken_Synth[token] = synth;
        arraySynths.push(synth); 
        isSynth[synth] = true;
        addCollateralTx += 1;
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
        uint _actualInputCollateral = _handleTransferIn(lpToken, inputLPToken, synth);
        totalCDPCollateral[synth][lpToken] = totalCDPCollateral[lpToken][synth].add(_actualInputCollateral);
        addCollateralTx += 1;
        synthMinted = Synth(synth).addCollateralForMember(lpToken, member);
        totalCDPDebt[synth]= totalCDPDebt[synth].add(synthMinted);
        return synthMinted;
    }

    function removeCollateral(uint basisPoints, address synth) public returns (uint lpTokens){
        require((basisPoints > 0 && basisPoints <= 10000), "InputErr");
        uint _synths = iUTILS(_DAO().UTILS()).calcPart(basisPoints, iBEP20(getSynth(synth)).balanceOf(msg.sender));
        lpTokens = removeCollateralForMember(_synths, synth, msg.sender);
        return lpTokens;
    }
    function removeCollateralForMember(uint synthUnits, address synth, address member) public returns (uint lpCollateral){
        require(isSynth[synth] == true, "Synth must exist");
        require(synthUnits > 0, 'need synths');
        Synth(synth).transferTo(synth, synthUnits);
        lpCollateral = Synth(synth).removeCollateral();
    }
    // handle input LP transfers 
    function _handleTransferIn(address _lptoken, uint256 _amount, address _synth) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_lptoken).balanceOf(_synth); 
                iPOOL(_lptoken).transferTo(_synth, _amount); 
                actual = iBEP20(_lptoken).balanceOf(_synth).sub(startBal);
        }
    }
    // handle output transfers
    function _handleTransferOut(address _token, uint256 _amount, address _recipient) internal {
        if(_amount > 0) {
            iBEP20(_token).transfer(_recipient, _amount);
        }
    }
   
    function getSynth(address token) public view returns(address synth){
        return mapToken_Synth[token];
    }


 

    //==================================================================================//
    // Swapping Functions
    
    //=================================onlyDAO=====================================//


    //======================================HELPERS========================================//
 
}