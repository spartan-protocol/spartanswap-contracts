// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iDAO.sol";
import "./Pool.sol";  

contract PoolFactory { 
    address public BASE;
    address public WBNB;
    address public DEPLOYER;
    uint public curatedPoolSize;
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
    constructor (address _base, address _wbnb) {
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
    function createPoolADD(uint256 inputBase, uint256 inputToken, address token) external returns(address pool){
        require(getPool(token) == address(0));
        require((inputToken > 0 && inputBase >= (10000*10**18)), "!Minimum");
        Pool newPool; address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        require(_token != BASE && iBEP20(_token).decimals() == 18);
        newPool = new Pool(BASE, _token); 
        pool = address(newPool);
        mapToken_Pool[_token] = pool;
        _handleTransferIn(BASE, inputBase, pool);
        _handleTransferIn(token, inputToken, pool);
        arrayPools.push(pool);
        arrayTokens.push(_token);
        isListedPool[pool] = true;
        Pool(pool).addForMember(msg.sender);
        emit CreatePool(token,pool);
        return pool;
    }
    function createPool(address token) external onlyDAO returns(address pool){
        require(getPool(token) == address(0));
        Pool newPool; address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB
        newPool = new Pool(BASE, _token); 
        pool = address(newPool);
        mapToken_Pool[_token] = pool;
        arrayPools.push(pool);
        arrayTokens.push(_token);
        isListedPool[pool] = true;
        emit CreatePool(token,pool);
        return pool;
    }
    function addCuratedPool(address token) external onlyDAO {
        require(token != BASE);
        address _pool = getPool(token);
        require(isListedPool[_pool] == true);
        require(curatedPoolCount() < curatedPoolSize, "!Available"); 
        isCuratedPool[_pool] = true;
        emit AddCuratePool(_pool, isCuratedPool[_pool]);
    }
    function removeCuratedPool(address token) external onlyDAO {
        require(token != BASE);
        address _pool = getPool(token);
        require(isCuratedPool[_pool] == true);
        isCuratedPool[_pool] = false;
        emit RemoveCuratePool(_pool, isCuratedPool[_pool]);
    }

    function curatedPoolCount() internal returns (uint){
        uint curatedPoolCount;
        for(uint i = 0; i< arrayPools.length; i++){
            if(isCuratedPool[arrayPools[i]] == true){
              curatedPoolCount += 1;
            }
        }
        return curatedPoolCount;
    }
    function _handleTransferIn(address _token, uint256 _amount, address _pool) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_token).balanceOf(_pool); 
                iBEP20(_token).transferFrom(msg.sender, _pool, _amount); 
                actual = iBEP20(_token).balanceOf(_pool) - (startBal);
        }
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
    function isPool(address pool) external view returns (bool){
        if(isListedPool[pool] == true){
            return true;
        }
        return  false;
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


}