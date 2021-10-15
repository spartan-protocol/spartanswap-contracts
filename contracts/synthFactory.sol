// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./Synth.sol";
import "./iPOOLFACTORY.sol";

contract SynthFactory { 
    address public immutable BASE;
    address public immutable WBNB;
    address public DEPLOYER;

    address[] public arraySynths; // Array of all valid synths
    mapping(address => address) private mapToken_Synth; // All Synths
    mapping(address => bool) public isSynth; // Point of truth
    event CreateSynth(address indexed token, address indexed pool, address indexed synth);

    constructor (address _base, address _wbnb) {
        require(_base != address(0), '!ZERO');
        require(_wbnb != address(0), '!ZERO');
        BASE = _base;
        WBNB = _wbnb;
        DEPLOYER = msg.sender;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER || msg.sender == _DAO().POOLFACTORY());
        _;
    }

    // Anyone can create a synth if it's pool is curated
    function createSynth(address token) external returns(address synth){
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        require(getSynth(token) == address(0), "exists"); // Synth must not already exist
        address _pool = _poolFactory.getPool(token); // Get pool address
        require(_pool != address(0), "!POOL"); // Must be a valid pool
        require(_poolFactory.isCuratedPool(_pool) == true, "!curated"); // Pool must be Curated
        Synth newSynth; address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB -> WBNB
        newSynth = new Synth(BASE, _token, _pool); // Deploy synth asset contract
        synth = address(newSynth); // Get new synth's address
        mapToken_Synth[_token] = synth; // Record synth address
        arraySynths.push(synth); // Add synth address to the array
        isSynth[synth] = true; // Record synth as valid
        emit CreateSynth(_token, _pool, synth);
        return synth;
    }

    // Record synth with the SynthFactory
    function _addSynth(address _synth) public onlyDAO {
        arraySynths.push(_synth); // Add synth address to the array
        isSynth[_synth] = true; // Record synth as valid
    }

    // Remove Synth with SynthFactory
    function removeSynth(address _token) external onlyDAO {
        address _synth = getSynth(_token);
        if (_synth != address(0)) {
            for(uint i = 0; i < arraySynths.length; i++){
                if(arraySynths[i] == _synth){
                    arraySynths[i] = arraySynths[arraySynths.length - 1]; // Move the last element into the place to delete
                    arraySynths.pop(); // Remove the last element
                }
            }
            isSynth[_synth] = false; // Record synth as inValid
        }
    }

    //================================ Helper Functions ==================================//
    
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