// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
//ERC20 Interface
interface ERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
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
    //======================================SPARTAN=========================================//
contract Sparta is ERC20 {
    using SafeMath for uint256;

    // ERC-20 Parameters
    string public name; string public symbol;
    uint256 public decimals; uint256 public override totalSupply;

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
    address public perlin1;
    address public burnAddress;

    // Events
    event NewCurve(address indexed DAO, uint256 newCurve);
    event NewIncentiveAddress(address indexed DAO, address newIncentiveAddress);
    event NewToken(address indexed DAO, string newName, string newSymbol);
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
        symbol = 'SPARTAN';
        decimals = 18;
        one = 10 ** decimals;
        baseline = 100000000 * one;
        totalSupply = baseline;
        totalCap = 3000000000 * one;
        emissionCurve = 2048;
        emitting = false;
        currentEra = 1;
        secondsPerEra = 1; //86400;
        nextEraTime = now + secondsPerEra;
        DAO = msg.sender;
        burnAddress = address(0);
        _balances[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    //========================================ERC20=========================================//
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
    // ERC20 Transfer function
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }
    // ERC20 Approve, change allowance functions
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
        return true;
    }
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    // ERC20 TransferFrom function
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    // Internal transfer function
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        _checkEmission();
        emit Transfer(sender, recipient, amount);
    }
    // Internal mint (upgrading and daily emissions)
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");
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
        uint256 decreasedAllowance = allowance(account, msg.sender).sub(amount, "ERC20: burn amount exceeds allowance");
        _approve(account, msg.sender, decreasedAllowance);
        _burn(account, amount);
    }
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");
        _balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds balance");
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    //=========================================DAO=========================================//
    // Can start
    function startEmissions() public onlyDAO {
        emitting = true;
    }
    // Can stop
    function stopEmissions() public onlyDAO {
        emitting = false;
    }
    // Can change emissionCurve
    function changeEmissionCurve(uint256 newCurve) public onlyDAO {
        emissionCurve = newCurve;
        emit NewCurve(msg.sender, newCurve);
    }
    // Can change daily time
    function changeEraDuration(uint256 newDuration) public onlyDAO {
        secondsPerEra = newDuration;
        emit NewDuration(msg.sender, newDuration);
    }
    // Can change Incentive Address
    function changeIncentiveAddress(address newIncentiveAddress) public onlyDAO {
        incentiveAddress = newIncentiveAddress;
        emit NewIncentiveAddress(msg.sender, newIncentiveAddress);
    }
    // Can change Token
    function changeToken(string memory newName, string memory newSymbol) public onlyDAO {
        name = newName; symbol = newSymbol;
        emit NewToken(msg.sender, newName, newSymbol);
    }
    // Can change DAO
    function changeDAO(address newDAO) public onlyDAO {
        require(newDAO != address(0), "Must not be zero address");
        DAO = newDAO;
        emit NewDAO(msg.sender, newDAO);
    }
    // Can purge DAO
    function purgeDAO() public onlyDAO {
        DAO = address(0);
        emit NewDAO(msg.sender, address(0));
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
    // function upgrade() public {
    //     uint balance = ERC20(perlin1).balanceOf(msg.sender);
    //     require(ERC20(perlin1).transferFrom(msg.sender, burnAddress, balance));
    //     _mint(msg.sender, balance);
    // }
}