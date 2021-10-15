// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iDAO.sol";
import "./iBONDVAULT.sol";
import "./Pool.sol";

contract PoolFactory  { 
    address private immutable BASE;  // Address of SPARTA base token contract
    address private immutable WBNB;  // Address of WBNB
    address private DEPLOYER;        // Address that deployed the contract | can be purged to address(0)
    uint private curatedPoolSize;    // Max amount of pools that can be curated status
    uint public curatedPoolCount;   // Current count of pools that are curated status
    address[] private arrayPools;    // Array of all deployed pools
    address[] private arrayTokens;   // Array of all listed tokens
    address[] private vaultAssets;   // Array of all vault-enabled assets (curated pools)
    uint256 private minBASE;

    mapping(address=>address) private mapToken_Pool;
    mapping(address=>bool) public isPool;
    mapping(address=>bool) public isCuratedPool;
 
    event CreatePool(address indexed token, address indexed pool);
    event AddCuratePool(address indexed pool);
    event RemoveCuratePool(address indexed pool);

    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == DEPLOYER || msg.sender == _DAO().DAO());
        _;
    }

    constructor (address _base, address _wbnb) {
        BASE = _base;
        WBNB = _wbnb;
        curatedPoolSize = 10;
        minBASE = 1000*10**18; //default
        DEPLOYER = msg.sender;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    // Can purge deployer once DAO is stable and final
    function purgeDeployer() external onlyDAO {
        DEPLOYER = address(0);
    }

    //Set Curated Pool Size
    function setParams(uint256 newSize, uint256 _minBASE) external onlyDAO {
        require(newSize > 0);
        curatedPoolSize = newSize;
        minBASE = _minBASE;
    }

    // Anyone can create a pool and add liquidity at the same time
    function createPoolADD(uint256 inputBase, uint256 inputToken, address token) external payable returns(address pool){
        require(token != BASE); // Token must not be SPARTA
        require(getPool(token) == address(0)); // Must not have a valid pool address yet
        require((inputToken > 100000 && inputBase >= minBASE)); // User must add at least 10,000 SPARTA liquidity & ratio must be finite
        Pool newPool; address _token = token;
        if(token == address(0)){
            _token = WBNB; // Handle BNB -> WBNB
        } else {
            require(token != BASE && iBEP20(token).decimals() == 18); // Token must not be SPARTA & it's decimals must be 18
        }
        newPool = new Pool(BASE, _token); // Deploy new pool
        pool = address(newPool); // Get address of new pool
        mapToken_Pool[_token] = pool; // Record the new pool address in PoolFactory
        _handleTransferIn(BASE, inputBase, pool); // Transfer SPARTA liquidity to new pool
        _handleTransferIn(token, inputToken, pool); // Transfer TOKEN / BNB (not WBNB) liquidity to new pool
        arrayPools.push(pool); // Add pool address to the pool array
        arrayTokens.push(_token); // Add token to the listed array
        isPool[pool] = true; // Record pool as currently listed
        emit CreatePool(_token, pool); // Emit CreatePool before the AddLiquidity event for subgraph
        Pool(pool).addForMember(msg.sender); // Perform the liquidity-add for the user
        return pool;
    }

    // Add pool to the Curated list, enabling it's synths, dividends & dao/vault weight
    function addCuratedPool(address token) external onlyDAO {
        require(token != BASE); // Token must not be SPARTA
        uint _currentProposal = iDAO(_DAO().DAO()).currentProposal(); // Get current proposal ID
        require(iDAO(_DAO().DAO()).mapPID_open(_currentProposal) == false); // Must not be an open proposal (de-syncs proposal votes)
        address _pool = getPool(token); // Get pool address
        require(isPool[_pool] == true); // Pool must be valid
        require(isCuratedPool[_pool] == false); // Pool must not be curated yet
        require(curatedPoolCount < curatedPoolSize); // Must be room in the Curated list
        isCuratedPool[_pool] = true; // Record pool as Curated
        curatedPoolCount = curatedPoolCount + 1; // Increase the curated pool count
        vaultAssets.push(_pool); // Push pool address into the curated array
        emit AddCuratePool(_pool);
    }

    // Remove pool from the Curated list
    function removeCuratedPool(address token) external onlyDAO {
        require(token != BASE); // Token must not be SPARTA
        address _pool = getPool(token); // Get pool address
        require(iBONDVAULT(_DAO().BONDVAULT()).isListed(_pool) == false);   
        require(isCuratedPool[_pool] == true); // Pool must be Curated
        isCuratedPool[_pool] = false; // Record pool as not curated
        curatedPoolCount = curatedPoolCount - 1; // Decrease the curated pool count
        for(uint i = 0 ; i < vaultAssets.length; i++){
            if(vaultAssets[i] == _pool){
                vaultAssets[i] = vaultAssets[vaultAssets.length - 1]; // Move the last element into the place to delete
                vaultAssets.pop(); // Remove the last element
            }
        }
        iSYNTHFACTORY(_DAO().SYNTHFACTORY()).removeSynth(token); // Remove synth from 'isSynth'
        emit RemoveCuratePool(_pool);
    }

    function _handleTransferIn(address _token, uint256 _amount, address _pool) internal  {
        require(_amount > 0);
        if(_token == address(0)){
            require(_amount == msg.value);
            (bool success, ) = payable(WBNB).call{value: _amount}(""); // Wrap BNB
            require(success);
            iBEP20(WBNB).transfer(_pool, _amount); // Tsf WBNB (PoolFactory -> Pool)
        } else {
            require(iBEP20(_token).transferFrom(msg.sender, _pool, _amount)); // Tsf TOKEN (User -> Pool)
        }
    }
    function getPool(address token) public view returns(address pool){
        if(token == address(0)){
            pool = mapToken_Pool[WBNB];   // Handle BNB
        } else {
            pool = mapToken_Pool[token];  // Handle normal token
        } 
        return pool;
    }
    function getVaultAssets() external view returns(address [] memory assets){
        return vaultAssets;
    }
    function getPoolAssets() external view returns(address [] memory pools){
        return arrayPools;
    }
    function getTokenAssets() external view returns(address [] memory tokens){
        return arrayTokens;
    }
}