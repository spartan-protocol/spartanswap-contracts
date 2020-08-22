// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
//iERC20 Interface
interface iERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint);
    function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
    function transfer(address, uint) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function approve(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
}

library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;
        return c;
    }
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        return c;
    }
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }
}
    //======================================SPARTA=========================================//
contract SpartaMinted is iERC20 {
    using SafeMath for uint256;

    // ERC-20 Parameters
    string public override name; string public override symbol;
    uint256 public override decimals; uint256 public override totalSupply;

    // ERC-20 Mappings
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Parameters
    uint256 one;
    bool public emitting;
    uint256 public emissionCurve;
    uint256 baseline;
    uint256 public totalCap;
    uint256 public secondsPerEra;
    uint256 public currentEra;
    uint256 public nextEraTime;

    address public incentiveAddress;
    address public DAO;
    address public burnAddress;

    address[] public assetArray;
    mapping(address => bool) public isListed;
    mapping(address => uint256) public mapAsset_maxClaim;
    mapping(address => uint256) public mapAsset_claimRate;
    mapping(address => mapping(address => bool)) public mapMemberAsset_hasClaimed;

    // Events
    event ListedAsset(address indexed DAO, address indexed asset, uint256 maxClaim, uint256 claimRate);
    event NewCurve(address indexed DAO, uint256 newCurve);
    event NewIncentiveAddress(address indexed DAO, address newIncentiveAddress);
    event NewAsset(address indexed DAO, string newName, string newSymbol);
    event NewDuration(address indexed DAO, uint256 newDuration);
    event NewDAO(address indexed DAO, address newOwner);
    event NewEra(uint256 currentEra, uint256 nextEraTime, uint256 emission);

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == DAO, "Must be DAO");
        _;
    }

    //=====================================CREATION=========================================//
    // Constructor
    constructor() public {
        name = 'SPARTAN PROTOCOL TOKEN';
        symbol = 'SPARTA';
        decimals = 18;
        one = 10 ** decimals;
        baseline = 100 * 10**6 * one;
        totalSupply = baseline;
        totalCap = 300 * 10**6 * one;
        emissionCurve = 2048;
        emitting = false;
        currentEra = 1;
        secondsPerEra = 1; //86400;
        nextEraTime = now + secondsPerEra;
        DAO = msg.sender;
        burnAddress = 0x0000000000000000000000000000000000000001;
        _balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    //========================================iERC20=========================================//
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
    // iERC20 Transfer function
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }
    // iERC20 Approve, change allowance functions
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
        return true;
    }
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue, "iERC20: decreased allowance below zero"));
        return true;
    }
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "iERC20: approve from the zero address");
        require(spender != address(0), "iERC20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    // iERC20 TransferFrom function
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount, "iERC20: transfer amount exceeds allowance"));
        return true;
    }

    // TransferTo function
    function transferTo(address recipient, uint256 amount) public returns (bool) {
        _transfer(tx.origin, recipient, amount);
        return true;
    }

    // Internal transfer function
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "iERC20: transfer from the zero address");
        _balances[sender] = _balances[sender].sub(amount, "iERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        _checkEmission();
        emit Transfer(sender, recipient, amount);
    }
    // Internal mint (upgrading and daily emissions)
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "iERC20: mint to the zero address");
        totalSupply = totalSupply.add(amount);
        require(totalSupply <= totalCap, "Must not mint more than the cap");
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }
    // Burn supply
    function burn(uint256 amount) public virtual {
        _burn(msg.sender, amount);
    }
    function burnFrom(address account, uint256 amount) public virtual {
        uint256 decreasedAllowance = allowance(account, msg.sender).sub(amount, "iERC20: burn amount exceeds allowance");
        _approve(account, msg.sender, decreasedAllowance);
        _burn(account, amount);
    }
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "iERC20: burn from the zero address");
        _balances[account] = _balances[account].sub(amount, "iERC20: burn amount exceeds balance");
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    //=========================================DAO=========================================//
    // Can list
    function listAssetWithClaim(address asset, uint256 maxClaim, uint256 claimRate) public onlyDAO returns(bool){
        if(!isListed[asset]){
            isListed[asset] = true;
            assetArray.push(asset);
        }
        mapAsset_maxClaim[asset] = maxClaim;
        mapAsset_claimRate[asset] = claimRate;
        emit ListedAsset(msg.sender, asset, maxClaim, claimRate);
        return true;
    }
    // Can delist
    function delistAsset(address asset) public onlyDAO returns(bool){
        isListed[asset] = false;
        mapAsset_maxClaim[asset] = 0;
        mapAsset_claimRate[asset] = 0;
        return true;
    }
    // Can start
    function startEmissions() public onlyDAO returns(bool){
        emitting = true;
        return true;
    }
    // Can stop
    function stopEmissions() public onlyDAO returns(bool){
        emitting = false;
        return true;
    }
    // Can change emissionCurve
    function changeEmissionCurve(uint256 newCurve) public onlyDAO returns(bool){
        emissionCurve = newCurve;
        emit NewCurve(msg.sender, newCurve);
        return true;
    }
    // Can change daily time
    function changeEraDuration(uint256 newDuration) public onlyDAO returns(bool) {
        secondsPerEra = newDuration;
        emit NewDuration(msg.sender, newDuration);
        return true;
    }
    // Can change Incentive Address
    function changeIncentiveAddress(address newIncentiveAddress) public onlyDAO returns(bool) {
        incentiveAddress = newIncentiveAddress;
        emit NewIncentiveAddress(msg.sender, newIncentiveAddress);
        return true;
    }
    // Can change DAO
    function changeDAO(address newDAO) public onlyDAO returns(bool){
        require(newDAO != address(0), "Must not be zero address");
        DAO = newDAO;
        emit NewDAO(msg.sender, newDAO);
        return true;
    }
    // Can purge DAO
    function purgeDAO() public onlyDAO returns(bool){
        DAO = address(0);
        emit NewDAO(msg.sender, address(0));
        return true;
    }

   //======================================EMISSION========================================//
    // Internal - Update emission function
    function _checkEmission() private {
        if ((now >= nextEraTime) && emitting) {                                            // If new Era and allowed to emit
            currentEra += 1;                                                               // Increment Era
            nextEraTime = now + secondsPerEra;                                             // Set next Era time
            uint256 _emission = getDailyEmission();                                        // Get Daily Dmission
            _mint(incentiveAddress, _emission);                                            // Mint to the Incentive Address
            emit NewEra(currentEra, nextEraTime, _emission);                               // Emit Event
        }
    }
    // Calculate Daily Emission
    function getDailyEmission() public view returns (uint256) {
        // emission = (adjustedCap - totalSupply) / emissionCurve
        // adjustedCap = totalCap * (totalSupply / 1bn)
        uint adjustedCap = (totalCap.mul(totalSupply)).div(baseline);
        return (adjustedCap.sub(totalSupply)).div(emissionCurve);
    }
    //======================================UPGRADE========================================//
    // Old Owners to Upgrade
    function upgrade(address asset) public {
        require(mapMemberAsset_hasClaimed[msg.sender][asset] == false, "Must not have already claimed");
        uint256 balance = iERC20(asset).balanceOf(msg.sender);
        uint256 claim = balance;                           // Start at balance
        if(balance > mapAsset_maxClaim[asset]){
            claim = mapAsset_maxClaim[asset];           // Reduce to the maximum
        }
        mapMemberAsset_hasClaimed[msg.sender][asset] = true;
        require(iERC20(asset).transferFrom(msg.sender, burnAddress, claim));
        uint256 adjustedClaimRate = getAdjustedClaimRate(asset);
        // sparta = rate * claim / 1e8
        uint256 sparta = (adjustedClaimRate.mul(claim)).div(one);
        _mint(msg.sender, sparta);
    }
     // Calculate Adjusted Claim Rate
    function getAdjustedClaimRate(address asset) public view returns (uint256 adjustedClaimRate) {
        uint256 claimRate = mapAsset_claimRate[asset];                           // Get Claim Rate
        if(totalSupply <= baseline){
            // return 100%
            return claimRate;
        } else {
            // (claim*(200-(totalSupply-baseline)))/200 -> starts 100% then goes to 0 at 300m. 
            uint256 _200m = totalCap.sub(baseline);
            return claimRate.mul(_200m.sub((totalSupply.sub(baseline)))).div(_200m);
        }
    }
    //======================================HELPERS========================================//
    // Helper Functions

    function assetCount() public view returns (uint256 count){
        return assetArray.length;
    }
    function allAssets() public view returns (address[] memory allAssets){
        return assetArray;
    }
    function assetsInRange(uint start, uint count) public view returns (address[] memory someAssets){
        if(count > assetCount()){count = assetCount();}
        address[] memory result = new address[](count);
        for (uint i = start; i<start.add(count); i++){
            result[i] = assetArray[i];
        }
        return result;
    }
}