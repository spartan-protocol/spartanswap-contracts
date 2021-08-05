// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./Pool.sol";
import "./iRESERVE.sol"; 
import "./iPOOLFACTORY.sol";  
import "./iWBNB.sol";
import "hardhat/console.sol";

contract Router {
    address public BASE;
    address public WBNB;
    address public DEPLOYER;
    uint256 public globalCAP;
    uint private maxTrades;         // Amount of dividend events per era
    uint private eraLength;         // Dividend factor to regulate the max percentage of RESERVE balance
    uint public normalAverageFee;   // The average fee size (dividend smoothing)
    uint private arrayFeeSize;      // The size of the average window used for normalAverageFee
    uint [] private feeArray;       // The array used to calc normalAverageFee
    uint private lastMonth;         // Timestamp of the start of current metric period (For UI)


    mapping(address=> uint) public mapAddress_30DayDividends;
    mapping(address=> uint) public mapAddress_Past30DayPoolDividends;

    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER);
        _;
    }

    constructor (address _base, address _wbnb) {
        BASE = _base;
        WBNB = _wbnb;
        arrayFeeSize = 20;
        eraLength = 30;
        maxTrades = 100;
        lastMonth = 0;
        globalCAP = 2000;
        DEPLOYER = msg.sender;
    }

    receive() external payable {}

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    // User adds liquidity
    function addLiquidity(uint inputBase, uint inputToken, address token) external payable{
        addLiquidityForMember(inputBase, inputToken, token, msg.sender);
    }

    // Contract adds liquidity for user
    function addLiquidityForMember(uint inputBase, uint inputToken, address token, address member) public payable{
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);  // Get pool address
        require(pool != address(0), "!POOL"); // Must be a valid pool
        _handleTransferIn(BASE, inputBase, pool); // Transfer SPARTA to pool
        _handleTransferIn(token, inputToken, pool); // Transfer TOKEN to pool
        Pool(pool).addForMember(member); // Add liquidity to pool for user
    }

    // Trade LP tokens for another type of LP tokens
    function zapLiquidity(uint unitsInput, address fromPool, address toPool) external {
        require(fromPool != toPool && unitsInput > 0, '!VALID'); // Pools must be different and input must be valid
        iPOOLFACTORY _poolFactory = iPOOLFACTORY(_DAO().POOLFACTORY());
        require(_poolFactory.isPool(fromPool) == true); // FromPool must be a valid pool
        require(_poolFactory.isPool(toPool) == true); // ToPool must be a valid pool
        address _fromToken = Pool(fromPool).TOKEN(); // Get token underlying the fromPool
        address _member = msg.sender; // Get user's address
        iBEP20(fromPool).transferFrom(_member, fromPool, unitsInput); // Transfer LPs from user to the pool
        Pool(fromPool).removeForMember(address(this)); // Remove liquidity to ROUTER
        iBEP20(_fromToken).transfer(fromPool, iBEP20(_fromToken).balanceOf(address(this))); // Transfer TOKENs from ROUTER to fromPool
        Pool(fromPool).swapTo(BASE, toPool); // Swap the received TOKENs for SPARTA then transfer to the toPool
        iBEP20(BASE).transfer(toPool, iBEP20(BASE).balanceOf(address(this))); // Transfer SPARTA from ROUTER to toPool
        Pool(toPool).addForMember(_member); // Add liquidity and send the LPs to user
    }

    // User adds liquidity asymetrically (one asset)
    function addLiquiditySingle(uint inputToken, bool fromBase, address token) external payable{
        addLiquiditySingleForMember(inputToken, fromBase, token, msg.sender);
    }

    // Contract adds liquidity asymetrically for user (one asset)
    function addLiquiditySingleForMember(uint inputToken, bool fromBase, address token, address member) public payable{
        require(inputToken > 0); // Must be valid input amount
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token); // Get pool address
        require(_pool != address(0), "!POOL"); // Must be a valid pool
        address _token = token;
        if(token == address(0)){_token = WBNB;} // Handle BNB -> WBNB
        if(fromBase){
            _handleTransferIn(BASE, inputToken, _pool); // Transfer SPARTA into pool
            Pool(_pool).addForMember(member); // Add liquidity and send LPs to user
        } else {
            _handleTransferIn(token, inputToken, _pool); // Transfer TOKEN into pool
            Pool(_pool).addForMember(member); // Add liquidity and send LPs to user
        }
    }

    // User removes liquidity - redeems a percentage of their balance
    function removeLiquidity(uint basisPoints, address token) external{
        require((basisPoints > 0 && basisPoints <= 10000)); // Must be valid basis points
        uint _units = iUTILS(_DAO().UTILS()).calcPart(basisPoints, iBEP20(iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token)).balanceOf(msg.sender));
        removeLiquidityExact(_units, token);
    }

    // User removes liquidity - redeems exact qty of LP tokens
    function removeLiquidityExact(uint units, address token) public {
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token); // Get the pool address
        require(_pool != address(0), "!POOL"); // Must be a valid pool
        address _member = msg.sender; // The the user's address
        iBEP20(_pool).transferFrom(_member, _pool, units); // Transfer LPs to the pool
        if(token != address(0)){
            Pool(_pool).removeForMember(_member); // Remove liquidity and send assets directly to user
        } else {
            Pool(_pool).removeForMember(address(this)); // If BNB; remove liquidity and send to ROUTER instead
            uint outputBase = iBEP20(BASE).balanceOf(address(this)); // Get the received SPARTA amount
            uint outputToken = iBEP20(WBNB).balanceOf(address(this)); // Get the received WBNB amount
            _handleTransferOut(token, outputToken, _member); // Unwrap to BNB & tsf it to user
            _handleTransferOut(BASE, outputBase, _member); // Transfer SPARTA to user
        }
    }

    // User removes liquidity asymetrically (one asset)
    function removeLiquiditySingle(uint units, bool toBase, address token) external{
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token); // Get pool address
        require(_pool != address(0), "!POOL"); // Must be a valid pool
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(_pool) == true); // Pool must be valid
        address _member = msg.sender; // Get user's address
        iBEP20(_pool).transferFrom(_member, _pool, units); // Transfer LPs to pool
        Pool(_pool).removeForMember(address(this)); // Remove liquidity & tsf to ROUTER
        address _token = token; // Get token address
        if(token == address(0)){_token = WBNB;} // Handle BNB -> WBNB
        if(toBase){
            iBEP20(_token).transfer(_pool, iBEP20(_token).balanceOf(address(this))); // Transfer TOKEN to pool
            Pool(_pool).swapTo(BASE, _member); // Swap TOKEN for SPARTA & tsf to user
        } else {
            iBEP20(BASE).transfer(_pool, iBEP20(BASE).balanceOf(address(this))); // Transfer SPARTA to pool
            Pool(_pool).swapTo(_token, address(this)); // Swap SPARTA for TOKEN & transfer to ROUTER
            _handleTransferOut(token, iBEP20(_token).balanceOf(address(this)), _member); // Send TOKEN to user
        } 
    }

    //============================== Swapping Functions ====================================//
    
    // Swap SPARTA for TOKEN
    function buyTo(uint amount, address token, address member, uint minAmount) public {
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token); // Get the pool address
        require(_pool != address(0), "!POOL"); // Must be a valid pool
        _handleTransferIn(BASE, amount, _pool); // Transfer SPARTA to pool
        uint fee;
        if(token != address(0)){
            (uint output, uint feey) = Pool(_pool).swapTo(token, member); // Swap SPARTA to TOKEN & tsf to user
            require(output > minAmount, '!RATE');
            fee = feey;
        } else {
            (uint output, uint feez) = Pool(_pool).swapTo(WBNB, address(this)); // Swap SPARTA to WBNB
            require(output > minAmount, '!RATE');
            _handleTransferOut(token, output, member); // Unwrap to BNB & tsf to user
            fee = feez;
        }
        getsDividend(_pool, fee); // Check for dividend & tsf it to pool
    }

    // Swap TOKEN for SPARTA
    function sellTo(uint amount, address token, address member, uint minAmount) public payable returns (uint){
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token); // Get pool address
        require(_pool != address(0), "!POOL"); // Must be a valid pool
        _handleTransferIn(token, amount, _pool); // Transfer TOKEN to pool
        (uint output, uint fee) = Pool(_pool).swapTo(BASE, member); // Swap TOKEN to SPARTA & transfer to user
        require(output > minAmount, '!RATE');
        getsDividend(_pool, fee); // Check for dividend & tsf it to pool
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
            buyTo(inputAmount, toToken, member, minAmount); // Swap SPARTA to TOKEN & tsf to user
        } else if(toToken == BASE) {
            sellTo(inputAmount, fromToken, member, minAmount); // Swap TOKEN to SPARTA & tsf to user
        } else {
            address _poolTo = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(toToken); // Get pool address
            require(_poolTo != address(0), "!POOL"); // Must be a valid pool
            uint feey = sellTo(inputAmount, fromToken, _poolTo, 0); // Swap TOKEN to SPARTA & tsf to pool
            address _toToken = toToken;
            if(toToken == address(0)){_toToken = WBNB;} // Handle BNB -> WBNB
            (uint _zz, uint _feez) = Pool(_poolTo).swapTo(_toToken, address(this)); // Swap SPARTA to TOKEN & tsf to ROUTER
            require(_zz > minAmount, '!RATE');
            uint fee = feey + _feez; // Get total slip fees
            getsDividend(_poolTo, fee); // Check for dividend & tsf it to pool
            _handleTransferOut(toToken,iBEP20(_toToken).balanceOf(address(this)), member); // Transfer TOKEN to user
        }
    }

    // Check if fee should generate a dividend & send it to the pool
    function getsDividend(address _pool, uint fee) internal {
        if(fee > 10**18 && iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_pool) == true){
            addTradeFee(fee); // Add fee to array for avgFee calcs etc
            addDividend(_pool, fee); // Check and tsf dividend to pool
        }
    }

    //============================== Token Transfer Functions ======================================//
    
    // Handle the transfer of assets into the pool
    function _handleTransferIn(address _token, uint256 _amount, address _pool) internal returns(uint256 actual){
        if(_amount > 0) {
            if(_token == address(0)){
                require((_amount == msg.value));
                (bool success, ) = payable(WBNB).call{value: _amount}(""); // Wrap BNB
                require(success, "!send");
                iBEP20(WBNB).transfer(_pool, _amount); // Transfer WBNB from ROUTER to pool
                actual = _amount;
            } else {
                uint startBal = iBEP20(_token).balanceOf(_pool); // Get prior TOKEN balance of pool
                iBEP20(_token).transferFrom(msg.sender, _pool, _amount); // Transfer TOKEN to pool
                actual = iBEP20(_token).balanceOf(_pool)-(startBal); // Get received TOKEN amount
            }
        }
    }

    // Handle the transfer of assets out of the ROUTER
    function _handleTransferOut(address _token, uint256 _amount, address _recipient) internal {
        if(_amount > 0) {
            if (_token == address(0)) {
                iWBNB(WBNB).withdraw(_amount); // Unwrap WBNB to BNB
                (bool success, ) = payable(_recipient).call{value:_amount}("");  // Send BNB to recipient
                require(success, "!send");
            } else {
                iBEP20(_token).transfer(_recipient, _amount); // Transfer TOKEN to recipient
            }
        }
    }

    //================================ Swap Synths ========================================//
    
    // Swap TOKEN to Synth
    function swapAssetToSynth(uint inputAmount, address fromToken, address toSynth) external payable {
        require(fromToken != toSynth); // Tokens must not be the same
        address _pool = iSYNTH(toSynth).POOL(); // Get underlying pool address
        require(_pool != address(0), "!POOL"); // Must be a valid pool
        if(fromToken != BASE){
            sellTo(inputAmount, fromToken, address(this), 0); // Swap TOKEN to SPARTA & tsf to ROUTER
            iBEP20(BASE).transfer(_pool, iBEP20(BASE).balanceOf(address(this))); // Transfer SPARTA from ROUTER to pool
        } else {
            iBEP20(BASE).transferFrom(msg.sender, _pool, inputAmount); // Transfer SPARTA from ROUTER to pool
        }
        (, uint fee) = Pool(_pool).mintSynth(msg.sender); // Mint synths & tsf to user
        getsDividend(_pool, fee); // Check and tsf dividend to pool
    }
   
    // Swap Synth to TOKEN
    function swapSynthToAsset(uint inputAmount, address fromSynth, address toToken) external {
        require(fromSynth != toToken); // Tokens must not be the same
        address _poolIN = iSYNTH(fromSynth).POOL(); // Get underlying pool address
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(toToken); // Get TOKEN's relevant pool address
        require(_pool != address(0), "!POOL"); // Must be a valid pool
        iBEP20(fromSynth).transferFrom(msg.sender, _poolIN, inputAmount); // Transfer synth from user to pool
        uint outputAmount;
        uint fee;
        if(toToken == BASE){
            Pool(_poolIN).burnSynth(msg.sender); // Swap Synths for SPARTA & tsf to user
        } else {
            (outputAmount,fee) = Pool(_poolIN).burnSynth(address(this)); // Swap Synths to SPARTA & tsf to ROUTER
            if(toToken != address(0)){
                (, uint feey) = Pool(_pool).swapTo(toToken, msg.sender); // Swap SPARTA to TOKEN & transfer to user
                fee = feey + fee;
            } else {
                (uint outputAmountY, uint feez) = Pool(_pool).swapTo(WBNB, address(this)); // Swap SPARTA to WBNB & tsf to ROUTER
                _handleTransferOut(toToken, outputAmountY, msg.sender); // Unwrap to BNB & tsf to user
                fee = feez + fee;
            }
        }
        getsDividend(_pool, fee); // Check and tsf dividend to pool
    }
    
    //============================= Token Dividends / Curated Pools =================================//
    
    // Calculate the Dividend and transfer it to the pool
    function addDividend(address _pool, uint256 _fees) internal {
        if(normalAverageFee > 0){
            uint reserve = iBEP20(BASE).balanceOf(_DAO().RESERVE()); // Get SPARTA balance in the RESERVE contract
            if(reserve > 0){
                uint dailyAllocation = (reserve / eraLength) / maxTrades; // Calculate max dividend
                uint numerator = _fees * dailyAllocation;
                uint feeDividend = numerator / (_fees + normalAverageFee); // Calculate actual dividend
                revenueDetails(feeDividend, _pool); // Add to revenue metrics
                iRESERVE(_DAO().RESERVE()).grantFunds(feeDividend, _pool); // Transfer dividend from RESERVE to POOL
                Pool(_pool).sync(); // Sync the pool balances to attribute the dividend to the existing LPers
            }
        }
    }

    // Add fee to feeArray, used to calculate normalAverageFee
    function addTradeFee(uint _fee) internal {
        uint _arrayFeeSize = arrayFeeSize;
        uint arrayFeeLength = feeArray.length;
        if(arrayFeeLength < _arrayFeeSize) {
            feeArray.push(_fee); // Build array until it is == arrayFeeSize
        } else {
            uint totalTradeFees = addFee(arrayFeeLength, _fee); 
            normalAverageFee = totalTradeFees / _arrayFeeSize; // Calc average fee
        }
    }

    // Shift out oldest fee item and add newest
    function addFee(uint arrayFeeLength, uint _fee) internal returns (uint totalTradeFees) {
        totalTradeFees = _fee; // add newest fee
        uint[] memory _feeArray = feeArray; // store in memory to save gas
        for (uint i = arrayFeeLength - 1; i > 0; i--) {
            _feeArray[i] = _feeArray[i - 1];
            totalTradeFees += _feeArray[i];
        }
        _feeArray[0] = _fee;
        feeArray = _feeArray;
    }

    function revenueDetails(uint _fees, address _pool) internal {
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
    
    //======================= Change Dividend Variables ===========================//

    function changeArrayFeeSize(uint _size) external onlyDAO {
        require(_size > 0, 'ZERO');
        arrayFeeSize = _size;
        normalAverageFee = 0; // Set to 0 to ensure dividends are paused until array is full again
        delete feeArray;
    }

    function changeMaxTrades(uint _maxtrades) external onlyDAO {
        require(_maxtrades > 0, 'ZERO');
        maxTrades = _maxtrades;
    }

    function changeEraLength(uint _eraLength) external onlyDAO {
        require(_eraLength > 0, 'ZERO');
        eraLength = _eraLength;	
    }
    function changeGlobalCap(uint _globalCap) external onlyDAO {	
        globalCAP = _globalCap;	
    }
    function changePoolCap(uint poolCAP, address _pool) external onlyDAO {
        Pool(_pool).setCAP(poolCAP);
    }
    function RTC(uint poolRTC, address _pool) external onlyDAO {
        Pool(_pool).RTC(poolRTC);
    }

    //================================== Helpers =================================//

    function currentPoolRevenue(address pool) external view returns(uint256) {
        return mapAddress_30DayDividends[pool];
    }

    function pastPoolRevenue(address pool) external view returns(uint256) {
        return mapAddress_Past30DayPoolDividends[pool];
    }
}