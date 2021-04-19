// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
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
    event CreateSynth(address indexed token, address indexed pool);

    constructor (address _base, address _wbnb, address _newDAO) public {
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

    //Create a synth asset - only from curated pools
    function createSynth(address token) external returns(address synth){
        require(getSynth(token) == address(0), "CreateErr");
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_pool) == true, "Must be Curated");
        Synth newSynth; address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        newSynth = new Synth(BASE,token, NDAO);  
        synth = address(newSynth);
        addSynth(_token, synth);
        emit CreateSynth(_token, synth);
        return synth;
    }

    function addSynth(address _token, address _synth) internal {
        require(_token != BASE);
        mapToken_Synth[_token] = _synth;
        arraySynths.push(_synth); 
        isSynth[_synth] = true;
    }

    //======================================HELPERS========================================//
    // Helper Functions

    function getSynth(address token) public view returns(address synth){
         if(token == address(0)){
            synth = mapToken_Synth[WBNB];   // Handle BNB
        } else {
            synth = mapToken_Synth[token];  // Handle normal token
        } 
        return synth;
    }
    function synthCount() external view returns(uint256){
        return arraySynths.length;
    }
    function getSynthsArray(uint256 i) external view returns(address){
        return arraySynths[i];
    }
   


}