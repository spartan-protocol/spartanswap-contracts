// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;

import "./Synth.sol";  

contract SynthFactory { 
    address public BASE;
    address public WBNB;
    address public DEPLOYER;

    address[] public arraySynths;
    mapping(address => address) private mapToken_Synth;
    mapping(address => bool) public isSynth;
    event CreateSynth(address indexed token, address indexed pool);

    constructor (address _base, address _wbnb) {
        BASE = _base;
        WBNB = _wbnb;
        DEPLOYER = msg.sender; 
    }

    modifier onlyDAO() {
        require(msg.sender == DEPLOYER, "DeployerErr");
        _;
    }

    function _DAO() internal view returns(iDAO) {
         return iBASE(BASE).DAO();
    }
    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }

    //Create a synth asset - only from curated pools
    function createSynth(address token) external returns(address synth){
        require(getSynth(token) == address(0), "CreateErr");
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_pool) == true, "!Curated");
        Synth newSynth; address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        newSynth = new Synth(BASE,_token);  
        synth = address(newSynth);
        addSynth(_token, synth);
        emit CreateSynth(token, synth);
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