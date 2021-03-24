// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
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

    mapping(address=>address) private mapToken_Pool;
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

    constructor (address _base, address _wbnb, address _newDAO) public payable {
        BASE = _base;
        WBNB = _wbnb;
        NDAO = _newDAO;
        curatedPoolSize = 10;
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
    function createPool(address token) public onlyDAO payable returns(address pool){
        require(getPool(token) == address(0));
        Pool newPool; address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        require(_token != BASE && iBEP20(_token).decimals() == 18);
        newPool = new Pool(BASE, _token, NDAO); 
        pool = address(newPool);
        addPool(_token, pool);
        return pool;
    }

    function migratePOOLData(address payable oldPoolFactory) public onlyDAO {
        uint256 poolTotalCount = PoolFactory(oldPoolFactory).poolCount();
        for(uint256 i = 0; i<poolTotalCount; i++){
            address pool = PoolFactory(oldPoolFactory).getPoolArray(i);
            address _token = Pool(pool).TOKEN();
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
        arrayPools.push(pool);
        isListedPool[pool] = true;
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
    function poolCount() public view returns(uint256){
        return arrayPools.length;
    }
    function getPoolArray(uint256 i) public view returns(address){
        return arrayPools[i];
    }
    function getCuratedPool(uint256 i) public view returns(address){
        return curatedPools[i];
    }
    function getCuratedPoolsLength() public view returns(uint256){
        return curatedPools.length;
    }
   


}