// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./Pool.sol";
import "./iRESERVE.sol"; 
import "./iPOOLFACTORY.sol";  
import "./iWBNB.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Router is ReentrancyGuard {
    address public immutable BASE;  // SPARTA base contract address
    address public immutable WBNB;  // Address of WBNB
    address public DEPLOYER;        // Address that deployed the contract
    uint256 public diviClaim;       // Basis points vs RESERVE holdings max dividend per month
    uint256 public globalCap;       // 
    uint private feeAllocation;     // Amount of dividend events per era
    uint public lastMonth;          // Timestamp of the start of current metric period (For UI)
    uint256 public curatedPoolsCount; // Count of curated pools, synced from PoolFactory once per month

    mapping(address=> uint) public mapAddress_30DayDividends; // Current incomplete-period NET SPARTA divis by pool
    mapping(address=> uint) public mapAddress_Past30DayPoolDividends; // Previous full-period NET SPARTA divis by pool

    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER);
        _;
    }

    constructor (address _base, address _wbnb) {
        require(_base != address(0), '!ZERO');
        require(_wbnb != address(0), '!ZERO');
        BASE = _base;
        WBNB = _wbnb;
        feeAllocation = 100;
        globalCap = 2000;
        diviClaim = 100;
        DEPLOYER = msg.sender;
    }

    receive() external payable {} // Used to receive BNB from WBNB contract

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO(); // Get the DAO address from SPARTA base contract
    }

    // User adds liquidity
    function addLiquidity(uint inputToken, address token) external payable{
        addLiquidityForMember(inputToken, token, msg.sender);
    }

    // Contract adds liquidity for user
    function addLiquidityForMember(uint inputToken, address token, address member) public payable {
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address pool = _poolFactory.getPool(token); // Get pool address
        require(_poolFactory.isPool(pool) == true, '!POOL'); // Pool must be valid
        uint256 baseAmount = iUTILS(_DAO().UTILS()).calcSpotValueInBase(token, inputToken); // The the SPARTA spot value of the token input
        _handleTransferIn(BASE, baseAmount, pool); // Transfer SPARTA (User -> Pool)
        _handleTransferIn(token, inputToken, pool); // Transfer TOKEN (User -> Pool)
        Pool(pool).addForMember(member); // Add liquidity; tsf LPs (Pool -> User)
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
            swapTo((_input / 2), BASE, token, address(this), 0); // Swap half of SPARTA to TOKEN (Not wrapped) (User -> Pool -> Router)
            _handleTransferOut(_token, iBEP20(_token).balanceOf(address(this)), _pool); // Tsf swapped TOKEN (Wrapped) (Router -> Pool)
            _handleTransferIn(BASE, (_input / 2), _pool); // Tsf other half of SPARTA (User -> Pool)
        } else {
            swapTo((_input / 2), token, BASE, address(this), 0); // Swap half of TOKEN (Not wrapped) to SPARTA (User -> Pool -> Router)
            _handleTransferOut(BASE, iBEP20(BASE).balanceOf(address(this)), _pool); // Tsf swapped SPARTA (Router -> Pool)
            _handleTransferIn(token, (_input / 2), _pool); // Tsf other half of TOKEN (Not wrapped) (User -> Pool)
        }
        Pool(_pool).addForMember(_member); // Add liquidity; tsf LPs (Pool -> User)
        _safetyTrigger(_pool); // Check pool ratios
    }

    // Trade LP tokens for another type of LP tokens
    function zapLiquidity(uint unitsInput, address fromPool, address toPool) external {
        require(fromPool != toPool && unitsInput > 0, '!VALID'); // Pools must be different and input must be valid
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        require(_poolFactory.isPool(fromPool) == true, '!POOL'); // FromPool must be a valid pool
        require(_poolFactory.isPool(toPool) == true, '!POOL'); // ToPool must be a valid pool
        address _fromToken = Pool(fromPool).TOKEN(); // Get token underlying the fromPool
        address _member = msg.sender; // Get user's address
        require(iBEP20(fromPool).transferFrom(_member, fromPool, unitsInput), '!transfer'); // Tsf LP units (User -> FromPool)
        Pool(fromPool).removeForMember(address(this)); // Remove liquidity; tsf SPARTA and fromTOKEN (Pool -> Router)
        require(iBEP20(_fromToken).transfer(fromPool, iBEP20(_fromToken).balanceOf(address(this))), '!transfer'); // Tsf fromTOKEN (Wrapped) (Router -> FromPool)
        Pool(fromPool).swapTo(BASE, toPool); // Swap fromTOKEN (Wrapped) for SPARTA (Router -> fromPool -> toPool)
        require(iBEP20(BASE).transfer(toPool, iBEP20(BASE).balanceOf(address(this))), '!transfer'); // Tsf SPARTA (Router -> toPool)
        Pool(toPool).addForMember(_member); // Add liquidity; tsf LPs (Pool -> User)
        _safetyTrigger(fromPool); // Check fromPool ratios
        _safetyTrigger(toPool); // Check toPool ratios
    }

    // User removes liquidity - redeems a percentage of their balance
    function removeLiquidity(uint basisPoints, address token) external{
        require(basisPoints > 0, '!VALID'); // Must be valid basis points, calcPart() handles the upper-check
        uint _units = iUTILS(_DAO().UTILS()).calcPart(basisPoints, iBEP20(iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token)).balanceOf(msg.sender)); // Calc units based on input basisPoints
        removeLiquidityExact(_units, token);
    }

    // User removes liquidity - redeems exact qty of LP tokens
    function removeLiquidityExact(uint units, address token) public {
        require(units > 0, '!VALID'); // Must be a valid amount
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '!SAFE'); // Must not be a global freeze
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address _pool = _poolFactory.getPool(token); // Get the pool address
        require(_poolFactory.isPool(_pool) == true, '!POOL'); // Pool must be valid
        address _member = msg.sender; // Get user's address
        require(iBEP20(_pool).transferFrom(_member, _pool, units), '!transfer'); // Tsf LP units (User -> Pool)
        if(token != address(0)){
            Pool(_pool).removeForMember(_member); // If not BNB; remove liquidity; tsf SPARTA and TOKEN (Pool -> User)
        } else {
            Pool(_pool).removeForMember(address(this)); // If BNB; remove liquidity; tsf SPARTA and WBNB (Pool -> Router)
            uint outputBase = iBEP20(BASE).balanceOf(address(this)); // Check the received SPARTA amount (Router)
            uint outputToken = iBEP20(WBNB).balanceOf(address(this)); // Check the received WBNB amount (Router)
            _handleTransferOut(token, outputToken, _member); // Unwrap to BNB & tsf (Router -> User)
            _handleTransferOut(BASE, outputBase, _member); // Tsf SPARTA (Router -> User)
        }
        _safetyTrigger(_pool); // Check pool ratios
    }

    function removeLiquidityAsym(uint units, bool toBase, address token) external {
        require(units > 0, '!VALID'); // Must be a valid amount
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '!SAFE'); // Must not be a global freeze
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address _pool = _poolFactory.getPool(token); // Get pool address
        require(_poolFactory.isPool(_pool) == true, '!POOL'); // Pool must be valid
        address _member = msg.sender; // Get user's address
        require(iBEP20(_pool).transferFrom(_member, _pool, units), '!transfer'); // Tsf LP units (User -> Pool)
        Pool(_pool).removeForMember(address(this)); // Remove liquidity; tsf SPARTA and TOKEN (Wrapped) (Pool -> Router)
        address _token = token; // Get token address
        if(token == address(0)){_token = WBNB;} // Handle BNB -> WBNB
        if(toBase){
            require(iBEP20(_token).transfer(_pool, iBEP20(_token).balanceOf(address(this))), '!transfer'); // Tsf TOKEN (Wrapped) (Router -> Pool)
            Pool(_pool).swapTo(BASE, address(this)); // Swap TOKEN (Wrapped) to SPARTA (Pool -> Router)
            require(iBEP20(BASE).transfer(_member, iBEP20(BASE).balanceOf(address(this))), '!transfer'); // Tsf total SPARTA (Router -> User)
        } else {
            require(iBEP20(BASE).transfer(_pool, iBEP20(BASE).balanceOf(address(this))), '!transfer'); // Tsf SPARTA (Router -> Pool)
            Pool(_pool).swapTo(_token, address(this)); // Swap SPARTA to TOKEN (Pool -> Router)
            _handleTransferOut(token, iBEP20(_token).balanceOf(address(this)), _member); // Tsf total TOKEN (Router -> User)
        } 
        _safetyTrigger(_pool); // Check pool ratios
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
            require(output > minAmount, '!RATE'); // Revert if output is too low
            fee = feey;
        } else {
            (uint output, uint feez) = Pool(_pool).swapTo(WBNB, address(this)); // If BNB; Swap SPARTA to WBNB (Pool -> Router)
            require(output > minAmount, '!RATE'); // Revert if output is too low
            _handleTransferOut(token, output, member); // Unwrap to BNB & tsf (Router -> User)
            fee = feez;
        }
        _safetyTrigger(_pool); // Check pool ratios
        _getsDividend(_pool, fee); // Check for dividend & tsf (Reserve -> Pool)
    }

    // Swap TOKEN for SPARTA
    function sellTo(uint amount, address token, address member, uint minAmount) public payable returns (uint){
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address _pool = _poolFactory.getPool(token); // Get pool address
        require(_poolFactory.isPool(_pool) == true, '!POOL'); // Pool must be valid
        _handleTransferIn(token, amount, _pool); // Tsf TOKEN (Not wrapped) (User -> Pool)
        (uint output, uint fee) = Pool(_pool).swapTo(BASE, member); // Swap TOKEN to SPARTA (Pool -> User)
        require(output > minAmount, '!RATE'); // Revert if output is too low
        _safetyTrigger(_pool); // Check pool ratios
        _getsDividend(_pool, fee); // Check for dividend & tsf (Reserve -> Pool)
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
            sellTo(inputAmount, fromToken, member, minAmount); // Swap TOKEN to SPARTA (User -> Pool -> User)
        } else {
            iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
            address _poolTo = _poolFactory.getPool(toToken); // Get pool address
            require(_poolFactory.isPool(_poolTo) == true, '!POOL'); // Pool must be valid
            sellTo(inputAmount, fromToken, _poolTo, 0); // Swap TOKEN (Not wrapped) to SPARTA (User -> fromPool -> toPool)
            address _toToken = toToken;
            if(toToken == address(0)){_toToken = WBNB;} // Handle BNB -> WBNB
            (uint _zz, uint _feez) = Pool(_poolTo).swapTo(_toToken, address(this)); // Swap SPARTA to TOKEN (Wrapped) (toPool -> Router)
            require(_zz > minAmount, '!RATE'); // Revert if output is too low
            _safetyTrigger(_poolTo); // Check pool ratios
            _getsDividend(_poolTo, _feez); // Check for dividend & tsf (Reserve -> Pool)
            _handleTransferOut(toToken, iBEP20(_toToken).balanceOf(address(this)), member); // Tsf TOKEN (Unwrapped) (Router -> User)
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
            sellTo(inputAmount, fromToken, address(this), 0); // Swap TOKEN to SPARTA (User -> Pool -> Router)
            require(iBEP20(BASE).transfer(_pool, iBEP20(BASE).balanceOf(address(this))), '!transfer'); // Tsf SPARTA (Router -> Pool)
        } else {
            require(iBEP20(BASE).transferFrom(msg.sender, _pool, inputAmount), '!transfer'); // Tsf SPARTA (User -> Pool)
        }
        (, uint fee) = Pool(_pool).mintSynth(msg.sender); // Swap SPARTA for SYNTH (Pool -> User)
        _safetyTrigger(_pool); // Check pool ratios
        _getsDividend(_pool, fee); // Check for dividend & tsf (Reserve -> Pool)
    }
   
    // Swap Synth to TOKEN
    function swapSynthToAsset(uint inputAmount, address fromSynth, address toToken) external {
        require(inputAmount > 0, '!VALID'); // Must be a valid amount
        require(fromSynth != toToken); // Tokens must not be the same
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '!SAFE'); // Must not be a global freeze
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY()); // Interface the PoolFactory
        address _synthPool = iSYNTH(fromSynth).POOL(); // Get underlying synthPool address
        require(_poolFactory.isPool(_synthPool) == true, '!POOL'); // synthPool must be valid
        address _swapPool = _poolFactory.getPool(toToken); // Get TOKEN's relevant swapPool address
        require(_poolFactory.isPool(_swapPool) == true, '!POOL'); // swapPool must be valid
        require(iBEP20(fromSynth).transferFrom(msg.sender, _synthPool, inputAmount), '!transfer'); // Tsf SYNTH (User -> synthPool)
        uint synthFee;
        if(toToken == BASE){
            (, synthFee) = Pool(_synthPool).burnSynth(msg.sender); // Swap SYNTH to SPARTA (synthPool -> User)
        } else {
            uint swapFee;
            uint outputAmountY;
            (, synthFee) = Pool(_synthPool).burnSynth(address(this)); // Swap SYNTH to SPARTA (synthPool -> Router)
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
    }

    //============================== Token Transfer Functions ======================================//
    
    // Handle the transfer of assets from user (wrap BNB)
    function _handleTransferIn(address _token, uint256 _amount, address _pool) internal nonReentrant {
        require(_amount > 0, '!GAS'); // Amount must be valid
        if(_token == address(0)){
            require((_amount == msg.value)); // Amount must be == msg.value
            (bool success, ) = payable(WBNB).call{value: _amount}(""); // Wrap BNB (User ->)
            require(success, "!send"); // BNB <> WBNB must be successful
            require(iBEP20(WBNB).transfer(_pool, _amount), '!transfer'); // Tsf WBNB (-> Pool)
        } else {
            require(iBEP20(_token).transferFrom(msg.sender, _pool, _amount), '!transfer'); // Tsf TOKEN (User -> Pool)
        }
    }

    // Handle the transfer of assets to user (Unwrap BNB)
    function _handleTransferOut(address _token, uint256 _amount, address _recipient) internal nonReentrant {
        if(_amount > 0) {
            if (_token == address(0)) {
                iWBNB(WBNB).withdraw(_amount); // Unwrap WBNB to BNB (Router ->)
                (bool success, ) = payable(_recipient).call{value:_amount}("");  // Tsf BNB (-> Recipient)
                require(success, "!send");
            } else {
                require(iBEP20(_token).transfer(_recipient, _amount), '!transfer'); // Tsf TOKEN (Router -> Recipient)
            }
        }
    }
    
    //============================= Token Dividends / Curated Pools =================================//

    // Check if fee should generate a dividend & send it to the pool
    function _getsDividend(address _pool, uint fee) internal {
        if(fee > 10**18 && iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_pool) == true){
            _addDividend(_pool, fee); // Check for dividend & tsf (Reserve -> Pool)
        }
    }

    // Calculate the Dividend and transfer it to the pool
    function _addDividend(address _pool, uint256 _fees) internal {
        uint reserve = iBEP20(BASE).balanceOf(_DAO().RESERVE()); // Get SPARTA balance in the RESERVE contract
        if(reserve > 0){
            uint256 _dividendReward = (reserve * diviClaim) / curatedPoolsCount / 10000; // Get the dividend share 
            if((mapAddress_30DayDividends[_pool] + _fees) < _dividendReward){
                _revenueDetails(_fees, _pool); // Add to revenue metrics
                iRESERVE(_DAO().RESERVE()).grantFunds(_fees, _pool); // Tsf SPARTA dividend (Reserve -> Pool)
                Pool(_pool).sync(); // Sync the pool balances to attribute the dividend to the existing LPers
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
            curatedPoolsCount = iPOOLFACTORY(_DAO().POOLFACTORY()).curatedPoolCount(); 
        }
    }
    
    //======================= Change Dividend Variables ===========================//

    function changeDiviClaim(uint _newDiviClaim) external onlyDAO {
        require(_newDiviClaim > 0 && _newDiviClaim < 5000, '!VALID');
        diviClaim = _newDiviClaim;
    }

    function changeGlobalCap(uint _globalCap) external onlyDAO {	
        globalCap = _globalCap;	
    }

    function changeSynthCap(uint synthCap, address _pool) external onlyDAO {
        Pool(_pool).setSynthCap(synthCap);
    }

    function RTC(uint poolRTC, address _pool) external onlyDAO {
        Pool(_pool).RTC(poolRTC);
    }

    function changeMinimumSynth(uint newMinimum, address _pool) external onlyDAO {
        Pool(_pool).minimumSynth(newMinimum);
    }

    function _safetyTrigger(address _pool) internal {
        if(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_pool)){
            if(Pool(_pool).freeze()){
                iRESERVE(_DAO().RESERVE()).setGlobalFreeze(true);   
            } 
        }
    }

    //================================== Helpers =================================//

    function currentPoolRevenue(address pool) external view returns(uint256) {
        return mapAddress_30DayDividends[pool];
    }

    function pastPoolRevenue(address pool) external view returns(uint256) {
        return mapAddress_Past30DayPoolDividends[pool];
    }
}