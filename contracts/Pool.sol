// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./iBEP20.sol";
import "./iUTILS.sol";
import "./iDAO.sol";
import "./iBASE.sol";
import "./iDAOVAULT.sol";
import "./iROUTER.sol";
import "./iSYNTH.sol"; 
import "./iSYNTHFACTORY.sol"; 
import "hardhat/console.sol";

contract Pool is iBEP20, ReentrancyGuard {  
    address public immutable BASE;  // Address of SPARTA base token contract
    address public immutable TOKEN; // Address of the layer1 TOKEN represented in this pool
    uint256 public synthCap;    // Basis points hard cap of synths that can be minted vs tokenDepth
    uint256 public baseCap;     // Cap on the depth of the pool (in SPARTA)
    uint256 private oldRate;    // Pool ratio from last period
    uint256 private period;     // Timestamp of next period
    uint256 private freezePoint; // Basis points change to trigger a freeze
    bool public freeze;         // Freeze status of the pool
    uint256 public initiationPeriod; // Lockup period of pool from genesis (no liqRemove)
    uint256 public collateral;  // Sparta value to virtualise mint/burn synths
    uint public minSynth;       // Basis points for minimum virtualisation derived from base/token depths

    string private _name;
    string private _symbol;
    uint8 public override immutable decimals;
    uint256 public override totalSupply;
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    uint256 public baseAmount;  // SPARTA amount that should be in the pool
    uint256 public tokenAmount; // TOKEN amount that should be in the pool

    uint public lastMonth;          // Timestamp of the start of current metric period (For UI)
    uint public immutable genesis;  // Timestamp from when the pool was first deployed (For UI)

    uint256 public map30DPoolRevenue;       // Tally of revenue during current incomplete metric period (for UI)
    uint256 public mapPast30DPoolRevenue;   // Tally of revenue from last full metric period (for UI)
    uint256 [] public revenueArray;         // Array of the last two full metric periods (For UI)
    
    event AddLiquidity(address indexed member, uint inputBase, uint inputToken, uint unitsIssued);
    event RemoveLiquidity(address indexed member, uint outputBase, uint outputToken, uint unitsClaimed);
    event Swapped(address indexed tokenFrom, address indexed tokenTo, address indexed recipient, uint inputAmount, uint outputAmount, uint fee);
    event MintSynth(address indexed member, uint256 baseAmount, uint256 liqUnits, uint256 synthAmount, uint256 fee);
    event BurnSynth(address indexed member, uint256 baseAmount, uint256 liqUnits, uint256 synthAmount, uint256 fee);

    function SYNTH() public view returns(address) {
        return iSYNTHFACTORY(_DAO().SYNTHFACTORY()).getSynth(TOKEN); // Get the relevant synth address
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO(); // Get the DAO address reported by Sparta base contract
    }

    // Restrict access
    modifier onlyPROTOCOL() {
        require(msg.sender == _DAO().ROUTER() || msg.sender == _DAO().SYNTHVAULT()); 
        _;
    }
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO());
        _;
    }
     modifier onlySYNTH() {
        require(msg.sender == SYNTH());
        require(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(SYNTH()),'!SYNTH');
        _;
    }

    constructor (address _base, address _token) {
        require(_base != address(0), '!ZERO');
        require(_token != address(0), '!ZERO');
        BASE = _base;
        TOKEN = _token;
        string memory poolName = "-SpartanProtocolPool";
        string memory poolSymbol = "-SPP";
        _name = string(abi.encodePacked(iBEP20(_token).name(), poolName));
        _symbol = string(abi.encodePacked(iBEP20(_token).symbol(), poolSymbol));
        decimals = 18;
        genesis = block.timestamp;
        synthCap = 3000;
        freezePoint = 3000;
        baseCap = 100000;
        period = block.timestamp;
        initiationPeriod = 604800;
        minSynth = 500;
    }

    //========================================iBEP20=========================================//

    function name() external view override returns (string memory) {
        return _name;
    }

    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address recipient, uint256 amount) external virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) external virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external virtual returns (bool) {
        uint256 currentAllowance = _allowances[msg.sender][spender];
        require(currentAllowance >= subtractedValue, "!approval");
        _approve(msg.sender, spender, currentAllowance - subtractedValue);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "!owner");
        require(spender != address(0), "!spender");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount) external virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 currentAllowance = _allowances[sender][msg.sender];
        require(currentAllowance >= amount, "!approval");
        _approve(sender, msg.sender, currentAllowance - amount);
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "!sender");
        require(recipient != address(0), '!BURN');
        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "!balance");
        _balances[sender] = senderBalance - amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "!account");
        totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function burn(uint256 amount) external onlySYNTH virtual override {
        _burn(msg.sender, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "!account");
        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "!balance");
        _balances[account] = accountBalance - amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }

    //====================================POOL FUNCTIONS =================================//

    // Contract adds liquidity for user 
    function addForMember(address member) external onlyPROTOCOL returns (uint liquidityUnits){
        uint256 _actualInputBase = _getAddedBaseAmount(); // Get the received SPARTA amount
        require((baseAmount + _actualInputBase) < baseCap, "RTC"); // LiqAdd must not push TVL over the cap
        uint256 _actualInputToken = _getAddedTokenAmount(); // Get the received TOKEN amount
        liquidityUnits = iUTILS(_DAO().UTILS()).calcLiquidityUnits(_actualInputBase, baseAmount, _actualInputToken, tokenAmount, totalSupply); // Calculate LP tokens to mint
        if(baseAmount == 0 || tokenAmount == 0){
            require(_actualInputBase >= (100 * 10**18) && _actualInputToken >= 10000, "!Balanced");
            uint createFee = 100 * liquidityUnits / 10000; // First liqAdd charges 1% fee to the base contract (permanently removed from circulation; prevent 1wei rounding)
            liquidityUnits -= createFee; // Remove fee from the calculated LP units
            _mint(BASE, createFee); // Mint the fee portion of the LP units to the BASE contract (permanently removed from circulation)
            oldRate = (_actualInputBase * _actualInputBase) / _actualInputToken; // Set the first / initial rate
        }
        _incrementPoolBalances(_actualInputBase, _actualInputToken); // Update recorded BASE and TOKEN amounts
        _mint(member, liquidityUnits); // Mint the remaining LP tokens directly to the user
        emit AddLiquidity(member, _actualInputBase, _actualInputToken, liquidityUnits);
        return liquidityUnits;
    }

    // Contract removes liquidity for the user
    function removeForMember(address member) external onlyPROTOCOL returns (uint outputBase, uint outputToken) {
        require(block.timestamp > (genesis + initiationPeriod), '!INITIATED'); // Can not remove liquidity until 7 days after pool's creation
        uint256 _actualInputUnits = balanceOf(address(this)); // Get the received LP units amount
        iUTILS _utils = iUTILS(_DAO().UTILS()); // Interface the UTILS contract
        outputBase = _utils.calcLiquidityHoldings(_actualInputUnits, BASE, address(this)); // Get the SPARTA value of LP units
        outputToken = _utils.calcLiquidityHoldings(_actualInputUnits, TOKEN, address(this)); // Get the TOKEN value of LP units
        _decrementPoolBalances(outputBase, outputToken); // Update recorded SPARTA and TOKEN amounts
        _burn(address(this), _actualInputUnits); // Burn the LP tokens
        require(iBEP20(BASE).transfer(member, outputBase), '!transfer'); // Transfer the SPARTA to user
        require(iBEP20(TOKEN).transfer(member, outputToken), '!transfer'); // Transfer the TOKEN to user
        emit RemoveLiquidity(member, outputBase, outputToken, _actualInputUnits);
        return (outputBase, outputToken);
    }

    // Contract swaps tokens for the member
    function swapTo(address token, address member) external onlyPROTOCOL returns (uint outputAmount, uint fee) {
        require((token == BASE || token == TOKEN), "!BASE||TOKEN"); // Must be SPARTA or the pool's relevant TOKEN
        address _fromToken; uint _amount;
        if(token == BASE){
            _fromToken = TOKEN; // If SPARTA is selected; swap from TOKEN
            _amount = _getAddedTokenAmount(); // Get the received TOKEN amount
            (outputAmount, fee) = _swapTokenToBase(_amount); // Calculate the SPARTA output from the swap
        } else {
            _fromToken = BASE; // If TOKEN is selected; swap from SPARTA
            _amount = _getAddedBaseAmount(); // Get the received SPARTA amount
            (outputAmount, fee) = _swapBaseToToken(_amount); // Calculate the TOKEN output from the swap
        }
        emit Swapped(_fromToken, token, member, _amount, outputAmount, fee);
        require(iBEP20(token).transfer(member, outputAmount), '!transfer'); // Transfer the swap output to the selected user
        return (outputAmount, fee);
    }

    // Swap SPARTA for Synths
    function mintSynth(address member) external onlyPROTOCOL returns(uint outputAmount, uint fee) {
        address synthOut = SYNTH(); // Get the synth address
        require(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(synthOut), "!synth"); // Must be a valid Synth
        iUTILS _utils = iUTILS(_DAO().UTILS()); // Interface the UTILS contract
        uint256 _actualInputBase = _getAddedBaseAmount(); // Get received SPARTA amount
        require((baseAmount + _actualInputBase) < baseCap, "RTC"); // SPARTA input must not push TVL over the cap
        uint256 synthSupply = iBEP20(synthOut).totalSupply(); // Get the synth's total supply
        uint256 minDebt = minSynth * tokenAmount / 10000; // Get a min SPARTA virtualisation amount
        uint256 minCollateral = minSynth * baseAmount / 10000; // Get a min TOKEN virtualisation amount
        uint256 _collateral = collateral; // Get the mapped SPARTA synth collateral
        if(synthSupply < minDebt){
            synthSupply = minDebt; // Make sure TOKEN virtualisation is at least the min amount
        }
        if(_collateral < minCollateral){
           _collateral = minCollateral; // Make sure SPARTA virtualisation is at least the min amount
        }
        outputAmount = _utils.calcSwapOutput(_actualInputBase, (baseAmount + _collateral), (tokenAmount - synthSupply)); // Calculate value of swapping SPARTA to the relevant underlying TOKEN (virtualised)
        uint256 synthsCap = tokenAmount * synthCap / 10000; // Calculate the synth cap based on token depth
        collateral += _actualInputBase; // Increase collateral mapping by SPARTA input
        require((outputAmount + synthSupply) < synthsCap, 'CAPPED'); // SYNTH output must not push SynthSupply over the cap
        uint _liquidityUnits = _utils.calcLiquidityUnitsAsym(_actualInputBase, address(this)); // Calculate LP tokens to be minted
        _incrementPoolBalances(_actualInputBase, 0); // Update recorded SPARTA amount
        uint _fee = _utils.calcSwapFee(_actualInputBase, (baseAmount + _collateral), (tokenAmount - synthSupply)); // Calc slip fee in TOKEN (virtualised)
        fee = _utils.calcSpotValueInBase(TOKEN, _fee); // Convert TOKEN fee to SPARTA
        _mint(synthOut, _liquidityUnits); // Mint the LP tokens directly to the Synth contract to hold
        iSYNTH(synthOut).mintSynth(member, outputAmount); // Mint the Synth tokens directly to the user
        _addPoolMetrics(fee); // Add slip fee to the revenue metrics
        emit MintSynth(member, _actualInputBase, _liquidityUnits, outputAmount, fee);
        return (outputAmount, fee);
    }
    
    // Swap Synths for SPARTA
    function burnSynth(address member) external onlyPROTOCOL returns(uint outputAmount, uint fee) {
        address synthIN = SYNTH(); // Get the synth address
        require(synthIN != address(0), "!synth"); // Must be a valid Synth
        iUTILS _utils = iUTILS(_DAO().UTILS()); // Interface the UTILS contract
        uint256 synthSupply = iBEP20(synthIN).totalSupply(); // Get the synth's total supply
        uint _actualInputSynth = iBEP20(synthIN).balanceOf(address(this)); // Get received SYNTH amount
        uint256 minDebt = minSynth * tokenAmount / 10000; // Get a min SPARTA virtualisation amount
        uint256 minCollateral = minSynth * baseAmount / 10000; // Get a min TOKEN virtualisation amount
        uint256 _collateral = collateral; // Get the mapped SPARTA synth collateral
        if(synthSupply < minDebt){
            synthSupply = minDebt; // Make sure TOKEN virtualisation is at least the min amount
        }
        if(_collateral < minCollateral){
           _collateral = minCollateral; // Make sure SPARTA virtualisation is at least the min amount
        }
        uint outputBase = _utils.calcSwapOutput(_actualInputSynth, (tokenAmount - synthSupply), (baseAmount + _collateral)); // Calculate value of swapping relevant underlying TOKEN to SPARTA (virtualised)
        fee = _utils.calcSwapFee(_actualInputSynth, (tokenAmount - synthSupply), (baseAmount + _collateral)); // Calc slip fee in SPARTA (virtualised)
        collateral -= _actualInputSynth * collateral / synthSupply; // Decrease collateral mapping by share of removed supply
        _decrementPoolBalances(outputBase, 0); // Update recorded SPARTA amount
        _addPoolMetrics(fee); // Add slip fee to the revenue metrics
        uint liqUnits = iSYNTH(synthIN).burnSynth(_actualInputSynth); // Burn the input SYNTH units 
        _burn(synthIN, liqUnits); // Burn the synth-help LP units
        require(iBEP20(BASE).transfer(member, outputBase), '!transfer'); // Transfer SPARTA to user
        emit BurnSynth(member, outputBase, liqUnits, _actualInputSynth, fee);
        return (outputBase, fee);
    }

    //=======================================INTERNAL MATHS======================================//

    // Check the SPARTA amount received by this Pool
    function _getAddedBaseAmount() internal view returns(uint256 _actual){
        uint _baseBalance = iBEP20(BASE).balanceOf(address(this));
        if(_baseBalance > baseAmount){
            _actual = _baseBalance - baseAmount;
        } else {
            _actual = 0;
        }
        return _actual;
    }
  
    // Check the TOKEN amount received by this Pool
    function _getAddedTokenAmount() internal view returns(uint256 _actual){
        uint _tokenBalance = iBEP20(TOKEN).balanceOf(address(this)); 
        if(_tokenBalance > tokenAmount){
            _actual = _tokenBalance - tokenAmount;
        } else {
            _actual = 0;
        }
        return _actual;
    }

    // Calculate output of swapping SPARTA for TOKEN & update recorded amounts
    function _swapBaseToToken(uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = baseAmount;
        uint256 _Y = tokenAmount;
        iUTILS _utils = iUTILS(_DAO().UTILS());
        _y =  _utils.calcSwapOutput(_x, _X, _Y); // Calc TOKEN output 
        uint fee = _utils.calcSwapFee(_x, _X, _Y); // Calc TOKEN fee 
        _fee = _utils.calcSpotValueInBase(TOKEN, fee); // Convert TOKEN fee to SPARTA
        _setPoolAmounts(_X + _x, _Y - _y); // Update recorded BASE and TOKEN amounts
        _addPoolMetrics(_fee); // Add slip fee to the revenue metrics
        return (_y, _fee);
    }

    // Calculate output of swapping TOKEN for SPARTA & update recorded amounts
    function _swapTokenToBase(uint256 _x) internal returns (uint256 _y, uint256 _fee){
        uint256 _X = tokenAmount;
        uint256 _Y = baseAmount;
        iUTILS _utils = iUTILS(_DAO().UTILS());
        _y = _utils.calcSwapOutput(_x, _X, _Y); // Calc SPARTA output 
        _fee = _utils.calcSwapFee(_x, _X, _Y); // Calc SPARTA fee 
        _setPoolAmounts(_Y - _y, _X + _x); // Update recorded BASE and TOKEN amounts
        _addPoolMetrics(_fee); // Add slip fee to the revenue metrics
        return (_y, _fee);
    }

    //=======================================BALANCES=========================================//

    // Sync internal balances to actual
    function sync() external onlyDAO {
        baseAmount = iBEP20(BASE).balanceOf(address(this));
        tokenAmount = iBEP20(TOKEN).balanceOf(address(this));
    }

    // Set internal balances
    function _setPoolAmounts(uint256 _baseAmount, uint256 _tokenAmount) internal {
        baseAmount = _baseAmount;
        tokenAmount = _tokenAmount; 
        _safetyCheck();
    }

    // Increment internal balances
    function _incrementPoolBalances(uint _baseAmount, uint _tokenAmount) internal {
        baseAmount += _baseAmount;
        tokenAmount += _tokenAmount;
        _safetyCheck();
    }

    // Decrement internal balances
    function _decrementPoolBalances(uint _baseAmount, uint _tokenAmount) internal {
        baseAmount -= _baseAmount;
        tokenAmount -= _tokenAmount; 
        _safetyCheck();
    }

    function _safetyCheck() internal {
        if(!freeze){
            uint currentRate = (baseAmount * baseAmount) / tokenAmount; // Get current rate
            uint rateDiff;
            if (currentRate > oldRate) {
                rateDiff = currentRate - oldRate; // Get absolute rate diff
            } else {
                rateDiff = oldRate - currentRate; // Get absolute rate diff
            }
            rateDiff = rateDiff * 10000 / currentRate; // Get basispoints difference
            if (rateDiff >= freezePoint) {
                freeze = true; // If exceeding; flip freeze to true
            }
            if (block.timestamp > period) {
                period = block.timestamp + 3600; // Set new period
                oldRate = currentRate; // Update the stored ratio
            }
        }
    }
  
    //===========================================POOL FEE ROI=================================//

    function _addPoolMetrics(uint256 _fee) internal {
        if (lastMonth == 0) {
            lastMonth = block.timestamp;
        }
        if (block.timestamp <= (lastMonth + 2592000)) {
            map30DPoolRevenue = map30DPoolRevenue + _fee;
        } else {
            lastMonth = block.timestamp;
            mapPast30DPoolRevenue = map30DPoolRevenue;
            _archiveRevenue(mapPast30DPoolRevenue);
            map30DPoolRevenue = _fee;
        }
    }

    function _archiveRevenue(uint _totalRev) internal {
        uint[] memory _revenueArray = revenueArray; // store in memory to save gas
        if (_revenueArray.length == 2) {
            _revenueArray[0] = _revenueArray[1]; // Shift previous value to start of array
            _revenueArray[1] = _totalRev; // Replace end of array with new value
            revenueArray = _revenueArray; // Replace storage array with memory array
        } else {
            revenueArray.push(_totalRev);
        }
    }

    //=========================================== SYNTH CAPS =================================//
    
    function setSynthCap(uint256 _synthCap) external onlyPROTOCOL {
        require(_synthCap <= 3000, '!MAX');
        synthCap = _synthCap;
    }

    function RTC(uint256 _newRTC) external onlyPROTOCOL {
        require(_newRTC <= (baseCap * 2), '!MAX');
        baseCap = _newRTC;
    }

    function minimumSynth(uint256 _newMinimum) external onlyPROTOCOL {
        require(_newMinimum >= 250 || _newMinimum <= 3000, '!VALID');
        minSynth = _newMinimum;
    }

    function setFreezePoint(uint256 _newFreezePoint) external onlyPROTOCOL {
        freezePoint = _newFreezePoint;
    }

    function flipFreeze(uint newPeriod) external onlyPROTOCOL {
        require(newPeriod < 580, '!VALID');
        freeze = !freeze;
        period = block.timestamp + newPeriod;
    }

    function setInitiation(uint newInitiation) external onlyPROTOCOL {
        require(newInitiation < 604800, '!VALID');
        initiationPeriod = newInitiation;
    }
}
