// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import "./synth.sol";  

contract SynthFactory { 
    address public BASE;
    address public WBNB;
    address public DEPLOYER;
    address public NDAO;

    address[] public arraySynths;
    mapping(address => address) private mapToken_Synth;
    mapping(address => bool) public isSynth;


    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == DEPLOYER || msg.sender == _DAO().ROUTER() || msg.sender == _DAO().DAO());
        _;
    }
    modifier onlyDEPLOYER() {
        require(msg.sender == DEPLOYER );
        _;
    }

    constructor (address _base, address _wbnb, address _newDAO) public payable {
        BASE = _base;
        WBNB = _wbnb;
        NDAO = _newDAO;
        DEPLOYER = msg.sender;
    }

    function _DAO() internal view returns(iDAO) {
        bool status = iDAO(NDAO).MSTATUS();
        if(status == true){
         return iBASE(BASE).DAO();
        }else{
          return iNDAO(NDAO).DAO();
        }
    }

    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }

    //Create a synth asset - only from curated pools
    function createSynth(address token) public returns(address synth){
        require(getSynth(token) == address(0), "CreateErr");
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_pool) == true, "Must be Curated");
        Synth newSynth; 
        newSynth = new Synth(BASE,token, NDAO);  
        synth = address(newSynth);
        addSynth(token, synth);
        return synth;
    }

   
    function addSynth(address _token, address _synth) internal {
        require(_token != BASE);
        mapToken_Synth[_token] = _synth;
        arraySynths.push(_synth); 
        isSynth[_synth] = true;
    }


    function destroyMe() public onlyDEPLOYER {
         selfdestruct(msg.sender);
    }

    function destroySynth(address synth) public onlyDAO returns(bool){
         Synth(synth).destroyMe(); 
        return true;
    }

    //======================================HELPERS========================================//
    // Helper Functions

      function getSynth(address token) public view returns(address synth){
        return mapToken_Synth[token];
    }
   


}