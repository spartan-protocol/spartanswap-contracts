// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./synthFactory.sol";  
import "./poolFactory.sol";  

contract AssetCuration {
    address public BASE;
    address public WBNB;
    address public DEPLOYER;

    uint public curatedPoolSize;

    address[] public arrayTokens;
    address[] public curatedPools;
    address[] public arrayPools;
    address[] public arraySynths;
    mapping(address=>address) private mapToken_Pool;
    mapping(address => address) private mapToken_Synth;
    mapping(address => bool) public isSynth;
    mapping(address=>bool) public isListedPool;
    mapping(address=>bool) public isCuratedPool;


    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == DEPLOYER || msg.sender == _DAO().ROUTER() || msg.sender == _DAO().DAO());
        _;
    }
    modifier onlyDEPLOYER() {
        require(msg.sender == DEPLOYER );
        _;
    }

    constructor (address _base, address _wbnb) public payable {
        BASE = _base;
        WBNB = _wbnb;
        curatedPoolSize = 10;
        DEPLOYER = msg.sender;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }
    function createPool(address token) public onlyDAO payable returns(address pool){
        require(getPool(token) == address(0));
        require(token != BASE && iBEP20(token).decimals() == 18);
        Pool newPool; address _token = token;
        newPool = new Pool(BASE, _token); 
        pool = address(newPool);
        addPool(_token, pool);
        return pool;
    }
    //Create a synth asset - only from curated pools
    function createSynth(address lpToken, address token, uint256 inputLPToken) public returns(address synth){
        require(getSynth(token) == address(0), "CreateErr");
        require(lpToken != BASE, "Must not be Base");
        require(inputLPToken > 0, "Must get lp token");
        require(isCuratedPool[lpToken] == true, "Must be Curated");
        Synth newSynth; 
        newSynth = new Synth(BASE,token);  
        synth = address(newSynth);
        addSynth(token, synth);
        return synth;
    }

    function migratePOOLData(address payable oldCURATE) public onlyDAO {
        uint256 tokenCount = AssetCuration(oldCURATE).tokenCount();
        for(uint256 i = 0; i<tokenCount; i++){
            address token = AssetCuration(oldCURATE).getToken(i);
            address pool = AssetCuration(oldCURATE).getPool(token);
            isListedPool[pool] = true;
            arrayTokens.push(token);
            arrayPools.push(pool);
            mapToken_Pool[token] = pool;
        }
    }
    function sortCuratedPoolsByDepth() internal{
         for (uint i = 0; i < curatedPools.length; ++i) 
        {
            for (uint j = i + 1; j < curatedPools.length; ++j) 
            {
                uint iDepth = iUTILS(_DAO().UTILS()).getDepth(curatedPools[i]);
                uint jDepth = iUTILS(_DAO().UTILS()).getDepth(curatedPools[j]);
                if (iDepth < jDepth) 
                {
                    address a = curatedPools[i];
                    curatedPools[i] = curatedPools[j];
                    curatedPools[j] = a;
                }
            }
        }
    }
    function challengLowestCuratedPool(address token) public onlyDAO {
         address _pool = getPool(token);
         require(isListedPool[_pool] == true);
         sortCuratedPoolsByDepth();
         uint challenger = iUTILS(_DAO().UTILS()).getDepth(_pool);
         uint lowestCurated = iUTILS(_DAO().UTILS()).getDepth(curatedPools[curatedPools.length - 1]);
        if(challenger > lowestCurated){
            address loser = curatedPools[curatedPools.length - 1];
            address winner = _pool;
            curatedPools.pop();
            isCuratedPool[winner] = true;
            curatedPools.push(winner);
            isCuratedPool[loser] = false;
        }
    }

    function addCuratedPool(address token) public onlyDAO {
        require(token != BASE);
        address _pool = getPool(token);
        require(isListedPool[_pool] == true);
        isCuratedPool[_pool] = true;
        curatedPools.push(_pool);
    }
    function removeCuratedPool(address token) public onlyDAO {
        require(token != BASE);
        address _pool = getPool(token);
        require(isCuratedPool[_pool] == true);
        isCuratedPool[_pool] = false;
    }

    function addPool(address _token, address pool) internal {
        require(_token != BASE);
        mapToken_Pool[_token] = pool;
        arrayTokens.push(_token); 
        isListedPool[pool] = true;
    }

    function addSynth(address _token, address _synth) internal {
        require(_token != BASE);
        mapToken_Synth[_token] = _synth;
        arraySynths.push(_synth); 
        isSynth[_synth] = true;
    }

    function isPool(address pool) public view returns (bool){
        if(isListedPool[pool] == true){
            return true;
        }
        return  false;
    }

    function destroyMe() public onlyDEPLOYER {
         selfdestruct(msg.sender);
    }

    function destroySynth(address synth) public onlyDAO returns(bool){
         Synth(synth).destroyMe(); 
        return true;
    }
     function destroyPool(address pool) public onlyDAO {
         Pool(pool).destroyMe();  
    }

    //======================================HELPERS========================================//
    // Helper Functions
    function getPool(address token) public view returns(address pool){
        if(token == address(0)){
            pool = mapToken_Pool[WBNB];   // Handle BNB
        } else {
            pool = mapToken_Pool[token];  // Handle normal token
        } 
        return pool;
    }
      function getSynth(address token) public view returns(address synth){
        return mapToken_Synth[token];
    }
    function tokenCount() public view returns(uint256){
        return arrayTokens.length;
    }
    function getToken(uint256 i) public view returns(address){
        return arrayTokens[i];
    }
    function getCuratedPool(uint256 i) public view returns(address){
        return curatedPools[i];
    }
    function getCuratedPoolsLength() public view returns(uint256){
        return curatedPools.length;
    }
   


}