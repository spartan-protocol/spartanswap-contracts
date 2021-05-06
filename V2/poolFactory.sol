// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./poolV2.sol";  

contract PoolFactory { 
    address public BASE;
    address public WBNB;
    address public DEPLOYER;
      address public NDAO;

    uint public curatedPoolSize;

    address[] public curatedPools;
    address[] public arrayPools;
    address[] public arrayTokens;

    mapping(address=>address) private mapToken_Pool;
    mapping(address=>bool) public isListedPool;
    mapping(address=>bool) public isCuratedPool;
    event CreatePool(address indexed token, address indexed pool);
    event AddCuratePool(address indexed pool, bool Curated);
    event RemoveCuratePool(address indexed pool, bool Curated);

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == DEPLOYER || msg.sender == _DAO().DAO());
        _;
    }
    constructor (address _base, address _wbnb, address _newDAO) public {
        BASE = _base;
        WBNB = _wbnb;
        NDAO = _newDAO;
        curatedPoolSize = 10;
        DEPLOYER = msg.sender;
    }
    function changeNDAO(address newDAO) public onlyDAO {
        NDAO = newDAO;
         uint i;
        for(i =0; i<arrayPools.length; i++){
            Pool(arrayPools[i]).changeNDAO(newDAO);
        }
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
    function createPool(address token) external onlyDAO returns(address pool){
        require(getPool(token) == address(0));
        Pool newPool; address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        require(_token != BASE && iBEP20(_token).decimals() == 18);
        newPool = new Pool(BASE, _token, NDAO); 
        pool = address(newPool);
        addPool(_token, pool);
        emit CreatePool(token,pool);
        return pool;
    }

    function migratePOOLData(address oldPoolFactory) external onlyDAO {
         uint256 tknCount = PoolFactory(oldPoolFactory).tokenCount();
         for(uint256 i = 0; i<tknCount; i++){
            address _token = PoolFactory(oldPoolFactory).getToken(i);
            address pool = PoolFactory(oldPoolFactory).getPool(_token);
            arrayTokens.push(_token);
            isListedPool[pool] = true;
            arrayPools.push(pool);
            mapToken_Pool[_token] = pool;
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
    function challengLowestCuratedPool(address token) external onlyDAO {
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

    function addCuratedPool(address token) external onlyDAO {
        require(token != BASE);
        address _pool = getPool(token);
        require(isListedPool[_pool] == true);
        isCuratedPool[_pool] = true;
        curatedPools.push(_pool);
        emit AddCuratePool(_pool, isCuratedPool[_pool]);
    }
    function removeCuratedPool(address token) external onlyDAO {
        require(token != BASE);
        address _pool = getPool(token);
        require(isCuratedPool[_pool] == true);
        isCuratedPool[_pool] = false;
        emit RemoveCuratePool(_pool, isCuratedPool[_pool]);
    }

    function addPool(address _token, address pool) internal {
        require(_token != BASE);
        mapToken_Pool[_token] = pool;
        arrayPools.push(pool);
        arrayTokens.push(_token);
        isListedPool[pool] = true;
    }

    function isPool(address pool) external view returns (bool){
        if(isListedPool[pool] == true){
            return true;
        }
        return  false;
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
    function poolCount() external view returns(uint256){
        return arrayPools.length;
    }
    function tokenCount() external view returns(uint256){
        return arrayTokens.length;
    }
    function getToken(uint256 i) external view returns(address){
        return arrayTokens[i];
    }
    function getPoolArray(uint256 i) external view returns(address){
        return arrayPools[i];
    }
    function getCuratedPool(uint256 i) external view returns(address){
        return curatedPools[i];
    }
    function getCuratedPoolsLength() external view returns(uint256){
        return curatedPools.length;
    }
   


}