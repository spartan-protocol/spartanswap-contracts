// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./Pool.sol";
import "./iRESERVE.sol"; 
import "./iROUTER.sol"; 
import "./iPOOLFACTORY.sol";  
import "./iWBNB.sol";
import "./TransferHelper.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Router is ReentrancyGuard{
    address private immutable BASE;  // SPARTA base contract address
    address private immutable WBNB;  // Address of WBNB
    address private DEPLOYER;        // Address that deployed the contract
    uint256 public diviClaim;       // Basis points vs RESERVE holdings max dividend per month
    uint public lastMonth;          // Timestamp of the start of current metric period (For UI)
    uint256 private curatedPoolsCount; // Count of curated pools, synced from PoolFactory once per month
    bool public synthMinting;
    uint public minDiv;

    mapping(address=> uint) public mapAddress_30DayDividends; // Current incomplete-period NET SPARTA divis by pool
    mapping(address=> uint) public mapAddress_Past30DayPoolDividends; // Previous full-period NET SPARTA divis by pool
    event Dividend(address Pool, uint256 amount);
    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER);
        _;
    }
    modifier onlyRESERVE() {
        require(msg.sender == _DAO().RESERVE());
        _;
    }

    // Can purge deployer once DAO is stable and final
    function purgeDeployer() external onlyDAO {
        DEPLOYER = address(0);
    }

    constructor (address _base, address _wbnb) {
        BASE = _base;
        WBNB = _wbnb;
        diviClaim = 500;
        synthMinting = false;
        DEPLOYER = msg.sender;
        minDiv = 10**18;
    }

    receive() external payable {} // Used to receive BNB from WBNB contract

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO(); // Get the DAO address from SPARTA base contract
    }

    // User adds liquidity
    function addLiquidity(uint inputToken, uint baseAmount, address token) external payable{
        addLiquidityForMember(inputToken, baseAmount, token, msg.sender);
    }

    // Contract adds liquidity for user
    function addLiquidityForMember(uint inputToken, uint baseAmount, address token, address member) public payable returns (uint256 LPsMinted) {
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address pool = _poolFactory.getPool(token); // Get pool address
        require(_poolFactory.isPool(pool) == true, '!POOL'); // Pool must be valid
        _handleTransferIn(BASE, baseAmount, pool); // Transfer SPARTA (User -> Pool)
        _handleTransferIn(token, inputToken, pool); // Transfer TOKEN (User -> Pool)
        LPsMinted = Pool(pool).addForMember(member); // Add liquidity; tsf LPs (Pool -> User)
        _safetyTrigger(pool); // Check pool ratios
    }

    function addLiquidityAsym(uint input, bool fromBase, address token) external payable {
        addLiquidityAsymForMember(input, fromBase, token, msg.sender);
    }

    function addLiquidityAsymForMember(uint _input, bool _fromBase, address token, address _member) public payable {
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address _pool = _poolFactory.getPool(token); // Get pool address
        require(_poolFactory.isPool(_pool) == true, '!POOL'); // Pool must be valid
        address _token = token; // Get token address
        if(token == address(0)){_token = WBNB;} // Handle BNB -> WBNB
        if(_fromBase){
            _handleTransferIn(BASE, _input, address(this));
            _handleTransferOut(BASE, (_input / 2), _pool);
            Pool(_pool).swapTo(_token, address(this)); // Swap TOKEN to SPARTA (Pool -> router)
            _handleTransferOut(BASE, iBEP20(BASE).balanceOf(address(this)), _pool); // Tsf swapped SPARTA (Router -> Pool)
            _handleTransferOut(_token, iBEP20(_token).balanceOf(address(this)), _pool); // Tsf remaining BNB (Router -> Pool)
        } else {
            _handleTransferIn(token, _input, address(this));
            _handleTransferOut(_token, (_input / 2), _pool);
            Pool(_pool).swapTo(BASE, address(this)); // Swap TOKEN to SPARTA (Pool -> router)
            _handleTransferOut(BASE, iBEP20(BASE).balanceOf(address(this)), _pool); // Tsf swapped SPARTA (Router -> Pool)
            _handleTransferOut(_token, iBEP20(_token).balanceOf(address(this)), _pool); // Tsf remaining BNB (Router -> Pool)
        }
        Pool(_pool).addForMember(_member); // Add liquidity; tsf LPs (Pool -> User)
        _safetyTrigger(_pool); // Check pool ratios
    }

    // Swap LP tokens for a different pool's LP tokens
    function zapLiquidity(uint unitsInput, address fromPool, address toPool) external nonReentrant {
        require(fromPool != toPool && unitsInput > 0, '!VALID'); // Pools must be different and input must be valid
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        require(_poolFactory.isPool(fromPool) == true, '!POOL'); // FromPool must be a valid pool
        if(_poolFactory.isCuratedPool(fromPool)){
            require(Pool(fromPool).freeze() == false);
        }
        require(_poolFactory.isPool(toPool) == true, '!POOL'); // ToPool must be a valid pool
        address _fromToken = Pool(fromPool).TOKEN(); // Get token underlying the fromPool
        address _toToken = Pool(toPool).TOKEN(); // Get token underlying the toPool
        address _member = msg.sender; // Get user's address
        TransferHelper.safeTransferFrom(fromPool, _member, fromPool, unitsInput);
        Pool(fromPool).removeForMember(address(this), _member); // Remove liquidity; tsf SPARTA and fromTOKEN (Pool -> Router)
        TransferHelper.safeTransfer(_fromToken, fromPool, iBEP20(_fromToken).balanceOf(address(this)));
        Pool(fromPool).swapTo(BASE, address(this)); // Swap fromTOKEN for SPARTA (FromPool -> Router)
        TransferHelper.safeTransfer(BASE, toPool, iBEP20(BASE).balanceOf(address(this)) / 2);
        Pool(toPool).swapTo(_toToken, address(this)); // Swap SPARTA for toTOKEN (ToPool -> Router)
        TransferHelper.safeTransfer(BASE, toPool, iBEP20(BASE).balanceOf(address(this)));
        TransferHelper.safeTransfer(_toToken, toPool, iBEP20(_toToken).balanceOf(address(this)));
        Pool(toPool).addForMember(_member); // Add liquidity; tsf LPs (Pool -> User)
        _safetyTrigger(fromPool); // Check fromPool ratios
        _safetyTrigger(toPool); // Check toPool ratios
    }

    // User removes liquidity - redeems exact qty of LP tokens
    function removeLiquidityExact(uint units, address token) public {
        require(units > 0, '!VALID'); // Must be a valid amount
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address _pool = _poolFactory.getPool(token); // Get the pool address
        if(_poolFactory.isCuratedPool(_pool)){
            require(Pool(_pool).freeze() == false);
        }
        require(_poolFactory.isPool(_pool) == true, '!POOL'); // Pool must be valid
        address _member = msg.sender; // Get user's address
        TransferHelper.safeTransferFrom(_pool, _member, _pool, units);
        if(token != address(0)){
            Pool(_pool).removeForMember(_member, _member); // If not BNB; remove liquidity; tsf SPARTA and TOKEN (Pool -> User)
        } else {
            Pool(_pool).removeForMember(address(this), _member); // If BNB; remove liquidity; tsf SPARTA and WBNB (Pool -> Router)
            uint outputBase = iBEP20(BASE).balanceOf(address(this)); // Check the received SPARTA amount (Router)
            uint outputToken = iBEP20(WBNB).balanceOf(address(this)); // Check the received WBNB amount (Router)
            _handleTransferOut(token, outputToken, _member); // Unwrap to BNB & tsf (Router -> User)
            _handleTransferOut(BASE, outputBase, _member); // Tsf SPARTA (Router -> User)
        }
        _safetyTrigger(_pool); // Check pool ratio

    }

    function removeLiquidityExactAsym(uint units, bool toBase, address token) public {
        require(units > 0, '!VALID'); // Must be a valid amount
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address _pool = _poolFactory.getPool(token); // Get pool address
        require(_poolFactory.isPool(_pool) == true, '!POOL'); // Pool must be valid
        require(Pool(_pool).freeze() == false); 
        address _member = msg.sender; // Get user's address
        TransferHelper.safeTransferFrom(_pool, _member, _pool, units);
        Pool(_pool).removeForMember(address(this),_member); // Remove liquidity; tsf SPARTA and TOKEN (Wrapped) (Pool -> Router)
        address _token = token; // Get token address
        if(token == address(0)){_token = WBNB;} // Handle BNB -> WBNB
        uint fee;
        if(toBase){
            TransferHelper.safeTransfer(_token, _pool, iBEP20(_token).balanceOf(address(this)));
            (, fee) = Pool(_pool).swapTo(BASE, address(this)); // Swap TOKEN (Wrapped) to SPARTA (Pool -> Router)
             TransferHelper.safeTransfer(BASE, _member, iBEP20(BASE).balanceOf(address(this)));
        } else {
            TransferHelper.safeTransfer(BASE, _pool, iBEP20(BASE).balanceOf(address(this)));
            (, fee) = Pool(_pool).swapTo(_token, address(this)); // Swap SPARTA to TOKEN (Pool -> Router)
            _handleTransferOut(token, iBEP20(_token).balanceOf(address(this)), _member); // Tsf total TOKEN (Router -> User)
        } 
        _safetyTrigger(_pool); // Check pool ratios
        _getsDividend(_pool, fee); // Check for dividend & tsf (Reserve -> Pool)
    }
 
    //============================== Swapping Functions ====================================//
    
    // Swap SPARTA for TOKEN
    function buyTo(uint amount, address token, address member, uint minAmount) public {
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address _pool = _poolFactory.getPool(token); // Get the pool address
        require(_poolFactory.isPool(_pool) == true, '!POOL'); // Pool must be valid
        _handleTransferIn(BASE, amount, _pool); // Tsf SPARTA (User -> Pool)
        uint fee;
        if(token != address(0)){
            (uint output, uint feey) = Pool(_pool).swapTo(token, member); // If not BNB; swap SPARTA to TOKEN (Pool -> User)
            require(output >= minAmount, '!RATE'); // Revert if output is too low
            fee = feey;
        } else {
            (uint output, uint feez) = Pool(_pool).swapTo(WBNB, address(this)); // If BNB; Swap SPARTA to WBNB (Pool -> Router)
            require(output >= minAmount, '!RATE'); // Revert if output is too low
            _handleTransferOut(token, output, member); // Unwrap to BNB & tsf (Router -> User)
            fee = feez;
        }
        _safetyTrigger(_pool); // Check pool ratios
        _getsDividend(_pool, fee); // Check for dividend & tsf (Reserve -> Pool)
    }

    // Swap TOKEN for SPARTA
    function sellTo(uint amount, address token, address member, uint minAmount, bool yesDiv) public payable returns (uint){
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address _pool = _poolFactory.getPool(token); // Get pool address
        require(_poolFactory.isPool(_pool) == true, '!POOL'); // Pool must be valid
        _handleTransferIn(token, amount, _pool); // Tsf TOKEN (Not wrapped) (User -> Pool)
        (uint output, uint fee) = Pool(_pool).swapTo(BASE, member); // Swap TOKEN to SPARTA (Pool -> User)
        require(output >= minAmount, '!RATE'); // Revert if output is too low
        _safetyTrigger(_pool); // Check pool ratios
        if(yesDiv){
             _getsDividend(_pool, fee); // Check for dividend & tsf (Reserve -> Pool)
        }
        return fee;
    }

    // User performs a simple swap (to -> from)
    function swap(uint256 inputAmount, address fromToken, address toToken, uint256 minAmount) external payable{
        swapTo(inputAmount, fromToken, toToken, msg.sender, minAmount);
    }

    // Contract checks which swap function the user will require
    function swapTo(uint256 inputAmount, address fromToken, address toToken, address member, uint256 minAmount) public payable{
        require(fromToken != toToken); // Tokens must not be the same
        if(fromToken == BASE){
            buyTo(inputAmount, toToken, member, minAmount); // Swap SPARTA to TOKEN (User -> Pool -> User)
        } else if(toToken == BASE) {
            sellTo(inputAmount, fromToken, member, minAmount, true); // Swap TOKEN to SPARTA (User -> Pool -> User)
        } else {
            iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
            address _poolTo = _poolFactory.getPool(toToken); // Get pool address
            require(_poolFactory.isPool(_poolTo) == true, '!POOL'); // Pool must be valid
            sellTo(inputAmount, fromToken, _poolTo, 0, false); // Swap TOKEN (Not wrapped) to SPARTA (User -> fromPool -> toPool)
            address _toToken = toToken;
            if(toToken == address(0)){_toToken = WBNB;} // Handle BNB -> WBNB
            (uint _zz, uint _feez) = Pool(_poolTo).swapTo(_toToken, address(this)); // Swap SPARTA to TOKEN (Wrapped) (toPool -> Router)
            require(_zz >= minAmount, '!RATE'); // Revert if output is too low
            _safetyTrigger(_poolTo); // Check pool ratios
            _handleTransferOut(toToken, iBEP20(_toToken).balanceOf(address(this)), member); // Tsf TOKEN (Unwrapped) (Router -> User)
            _getsDividend(_poolTo, _feez); // Check for dividend & tsf (Reserve -> Pool)
        }
    }

    //================================ Swap Synths ========================================//
    
    // Swap TOKEN to Synth
    function swapAssetToSynth(uint inputAmount, address fromToken, address toSynth) external payable {
        require(inputAmount > 0, '!VALID'); // Must be a valid amount
        require(fromToken != toSynth); // Tokens must not be the same
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '!SAFE'); // Must not be a global freeze
        address _pool = iSYNTH(toSynth).POOL(); // Get underlying pool address
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(_pool) == true, '!POOL'); // Pool must be valid
        if(fromToken != BASE){
            sellTo(inputAmount, fromToken, address(this), 0, false); // Swap TOKEN to SPARTA (User -> Pool -> Router)
           TransferHelper.safeTransfer(BASE, _pool, iBEP20(BASE).balanceOf(address(this)));
        } else {
             TransferHelper.safeTransferFrom(BASE, msg.sender, _pool, inputAmount);
        }
        (, uint fee) = Pool(_pool).mintSynth(msg.sender); // Swap SPARTA for SYNTH (Pool -> User)
        _safetyTrigger(_pool); // Check pool ratios
        _getsDividend(_pool, fee); // Check for dividend & tsf (Reserve -> Pool)
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '!SAFE'); // Must not be a global freeze
    }
   
    // Swap Synth to TOKEN
    function swapSynthToAsset(uint inputAmount, address fromSynth, address toToken) external {
        require(inputAmount > 0, '!VALID'); // Must be a valid amount
        require(fromSynth != toToken); // Tokens must not be the same
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '!SAFE'); // Must not be a global freeze
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address _synthPool = iSYNTH(fromSynth).POOL(); // Get underlying synthPool address
        require(_poolFactory.isPool(_synthPool) == true, '!POOL'); // synthPool must be valid
        TransferHelper.safeTransferFrom(fromSynth, msg.sender, _synthPool, inputAmount);
        uint synthFee;
        if(toToken == BASE){
            (, synthFee) = Pool(_synthPool).burnSynth(msg.sender, msg.sender); // Swap SYNTH to SPARTA (synthPool -> User)
        } else {
             address _swapPool = _poolFactory.getPool(toToken); // Get TOKEN's relevant swapPool address
               require(_poolFactory.isPool(_swapPool) == true, '!POOL'); // swapPool must be valid
               uint swapFee;
               uint outputAmountY;
            (, synthFee) = Pool(_synthPool).burnSynth(address(this), msg.sender); // Swap SYNTH to SPARTA (synthPool -> Router)
                _handleTransferOut(BASE, iBEP20(BASE).balanceOf(address(this)), _swapPool); // Tsf SPARTA (Router -> swapPool)
            if(toToken != address(0)){
                (, swapFee) = Pool(_swapPool).swapTo(toToken, msg.sender); // Swap SPARTA to TOKEN (swapPool -> User)
            } else {
                (outputAmountY, swapFee) = Pool(_swapPool).swapTo(WBNB, address(this)); // Swap SPARTA to WBNB (swapPool -> Router)
                _handleTransferOut(toToken, outputAmountY, msg.sender); // Tsf BNB (Unwrapped) (Router -> User)
            }
            _safetyTrigger(_swapPool); // Check swapPool ratios
            _getsDividend(_swapPool, swapFee); // Check for dividend & tsf (Reserve -> swapPool)
        }
        _safetyTrigger(_synthPool); // Check synthPool ratios
        _getsDividend(_synthPool, synthFee); // Check for dividend & tsf (Reserve -> synthPool)
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '!SAFE'); // Must not be a global freeze
    }

    //============================== Token Transfer Functions ======================================//
    
    // Handle the transfer of assets from user (wrap BNB)
    function _handleTransferIn(address _token, uint256 _amount, address _pool) internal nonReentrant {
        require(_amount > 0, '!GAS'); // Amount must be valid
        if(_token == address(0)){
            require((_amount == msg.value)); // Amount must be == msg.value
            TransferHelper.safeTransferBNB(WBNB,  _amount);
            TransferHelper.safeTransfer(WBNB, _pool, _amount);
        } else {
            TransferHelper.safeTransferFrom(_token, msg.sender, _pool, _amount);
        }
    }

    // Handle the transfer of assets to user (Unwrap BNB)
    function _handleTransferOut(address _token, uint256 _amount, address _recipient) internal nonReentrant {
        if(_amount > 0) {
            if (_token == address(0)) {
                iWBNB(WBNB).withdraw(_amount); // Unwrap WBNB to BNB (Router -> Router)
                TransferHelper.safeTransferBNB( _recipient,  _amount);
            } else {
                TransferHelper.safeTransfer(_token, _recipient, _amount);
            }
        }
    }
    
    //============================= Token Dividends / Curated Pools =================================//

    // Check if fee should generate a dividend & send it to the pool
    function _getsDividend(address _pool, uint fee) internal {
        if(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_pool) == true){
            if(fee < minDiv){
                fee = minDiv;
            }
            _addDividend(_pool, fee); // Check for dividend & tsf (Reserve -> Pool)
        }
    }

    // Calculate the Dividend and transfer it to the pool
    function _addDividend(address _pool, uint256 _fees) internal {
        uint reserve = iBEP20(BASE).balanceOf(_DAO().RESERVE()); // Get SPARTA balance in the RESERVE contract
        bool emissions = iRESERVE(_DAO().RESERVE()).emissions();
        if(reserve > 0 && emissions){
           uint256 _curatedPoolsCount = iPOOLFACTORY(_DAO().POOLFACTORY()).curatedPoolCount(); 
           if(_curatedPoolsCount != curatedPoolsCount){
               curatedPoolsCount = _curatedPoolsCount;
           }
            uint256 _dividendReward = (reserve * diviClaim) / _curatedPoolsCount / 10000; // Get the dividend share 
            if((mapAddress_30DayDividends[_pool] + _fees) < _dividendReward){
                _revenueDetails(_fees, _pool); // Add to revenue metrics
                iRESERVE(_DAO().RESERVE()).grantFunds(_fees, _pool); // Tsf SPARTA dividend (Reserve -> Pool)
                Pool(_pool).sync(); // Sync the pool balances to attribute the dividend to the existing LPers
                emit Dividend(_pool, _fees); 
            }
        }
    }

    function _revenueDetails(uint _fees, address _pool) internal {
        if(lastMonth == 0){
            lastMonth = block.timestamp;
        }
        if(block.timestamp <= lastMonth + 2592000){ // 30 days
            mapAddress_30DayDividends[_pool] = mapAddress_30DayDividends[_pool] + _fees;
        } else {
            lastMonth = block.timestamp;
            mapAddress_Past30DayPoolDividends[_pool] = mapAddress_30DayDividends[_pool];
            mapAddress_30DayDividends[_pool] = _fees;
        }
    }
    function _migrateRevenue(address oldRouter) external onlyDAO {
        lastMonth = iROUTER(oldRouter).lastMonth();  
        address [] memory pools = iPOOLFACTORY(_DAO().POOLFACTORY()).getPoolAssets(); 
        for(uint i = 0; i < pools.length; i++){
            mapAddress_30DayDividends[pools[i]] = iROUTER(oldRouter).mapAddress_30DayDividends(pools[i]);  
            mapAddress_Past30DayPoolDividends[pools[i]] = iROUTER(oldRouter).mapAddress_Past30DayPoolDividends(pools[i]);   
        }
    }
    
    //======================= Change Dividend Variables ===========================//

    function changeDiviClaim(uint _newDiviClaim, uint _newDivFee) external onlyDAO {
        require(_newDiviClaim > 0 && _newDiviClaim < 5000, '!VALID');
        require(_newDivFee < 1000, '!VALID');
        diviClaim = _newDiviClaim;
        minDiv = _newDivFee * 10**18;
    }

    function changeSynthCap(uint synthCap, address _pool) external onlyDAO {
        Pool(_pool).setSynthCap(synthCap);
    }

    function RTC(uint poolRTC, address _pool) external onlyDAO {
        Pool(_pool).RTC(poolRTC);
    }
    function flipSynthMinting() external onlyDAO {
        synthMinting = !synthMinting;
    }
    function syncPool(address _pool, uint256 amount) external onlyRESERVE {
        address _token = Pool(_pool).TOKEN();
        uint256 baseValue = iUTILS(_DAO().UTILS()).calcSpotValueInBase(_token, amount);
        _revenueDetails(baseValue, _pool);
        Pool(_pool).sync(); // Sync the pool balances to attribute reward to the LPers
    }

    function _safetyTrigger(address _pool) internal {
        if(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_pool)){
            if(Pool(_pool).freeze()){
                iRESERVE(_DAO().RESERVE()).setGlobalFreeze(true);   
            } 
            if(iRESERVE(_DAO().RESERVE()).globalFreeze()){
                uint256 freezeTime = iRESERVE(_DAO().RESERVE()).freezeTime(); 
                if(block.timestamp > freezeTime + 3600){
                   iRESERVE(_DAO().RESERVE()).setGlobalFreeze(false);   
                }
              }
        }
    }


    function updatePoolStatus() external {
       if(iRESERVE(_DAO().RESERVE()).globalFreeze()){
        address [] memory _vaultAssets = iPOOLFACTORY(_DAO().POOLFACTORY()).getVaultAssets(); // Get list of vault enabled assets
        bool unfreeze = true;
        for(uint i = 0; i < _vaultAssets.length; i++){
            if(Pool(_vaultAssets[i]).freeze()){
               unfreeze = false;
            }
        }
        if(unfreeze){
           iRESERVE(_DAO().RESERVE()).setGlobalFreeze(false);
        }
    }
    }

}