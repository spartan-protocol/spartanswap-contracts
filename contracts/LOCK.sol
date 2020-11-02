pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "@nomiclabs/buidler/console.sol";
//iBEP20 Interface
interface iBEP20 {
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
interface iBASE {
    function claim(address asset, uint256 amount) external payable;  
    function DAO() external view returns (iDAO);
}
interface iROUTER {
    function addLiquidity(uint inputBase, uint inputToken, address token) external payable returns (uint units);
}
interface iUTILS {
    function calcValueInBaseWithPool(address pool, uint256 amount) external view returns (uint256 value);
    function calcValueInBase(address token, uint256 amount) external view returns (uint256 value);
    function getPool(address token)external view returns (address value);
}
interface iDAO {
    function ROUTER() external view returns(iROUTER);
    function UTILS() external view returns(iUTILS);
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
contract Lock is iBEP20 {
    using SafeMath for uint256;

    // ERC-20 Parameters
    string public override name; string public override symbol;
    uint256 public override decimals; uint256 public override totalSupply;  

    // ERC-20 Mappings
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => LockedLP) public mapAddress_LockedLP;

    struct LockedLP{
        uint256 lockedLP;
        uint256 claimRate;
        uint256 secondsSinceLastClaim;
    }
  // Parameters
    address public BASE;
    address public ROUTER;

    //=====================================CREATION=========================================//
    // Constructor
    constructor(address _base, address _router) public {
         BASE = _base;
        ROUTER = _router;
        name = "lock-token";
        symbol  = "LTKN";
        decimals = 18;
        totalSupply = 1 * (10 ** 18);
        
         _balances[address(this)] = totalSupply;
        emit Transfer(address(0), address(this), totalSupply);

    }
    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }
    //========================================iBEP20=========================================//
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
    // iBEP20 Transfer function
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }
    // iBEP20 Approve, change allowance functions
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
        return true;
    }
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue, "iBEP20: decreased allowance below zero"));
        return true;
    }
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "iBEP20: approve from the zero address");
        require(spender != address(0), "iBEP20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    // iBEP20 TransferFrom function
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount, "iBEP20: transfer amount exceeds allowance"));
        return true;
    }

    // TransferTo function
    function transferTo(address recipient, uint256 amount) public returns (bool) {
        _transfer(tx.origin, recipient, amount);
        return true;
    }

    // Internal transfer function
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "iBEP20: transfer from the zero address");
        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    function burn() public returns (bool success){
        _approve(address(this), BASE, totalSupply);
        iBASE(BASE).claim(address(this), totalSupply);
        totalSupply = totalSupply.sub(totalSupply);
        return true;
    }

     function deposit(address asset, uint amount) public payable returns (bool success) {
        require(amount > 0, 'must get asset');
        if(asset == address(0)){
            require(msg.value > 0, 'get bnb');
        }
        uint spartaAllocation; uint liquidityUnits; address _pool = _DAO().UTILS().getPool(asset);
        spartaAllocation = _DAO().UTILS().calcValueInBase(asset, amount);
        iBEP20(asset).transferFrom(msg.sender, address(this), amount);
        iBEP20(asset).approve(ROUTER, amount); 
        iBEP20(BASE).approve(ROUTER, spartaAllocation); 
        liquidityUnits = iROUTER(ROUTER).addLiquidity(spartaAllocation, amount, asset);
        uint lpAdjusted = liquidityUnits.mul(5000).div(10000);
        mapAddress_LockedLP[msg.sender].lockedLP += lpAdjusted;
        mapAddress_LockedLP[msg.sender].secondsSinceLastClaim = now;
        mapAddress_LockedLP[msg.sender].claimRate = mapAddress_LockedLP[msg.sender].lockedLP.div(31536000);//12months 31536000
        iBEP20(_pool).transfer(msg.sender, lpAdjusted);
        return true;
    }

    //============================== CLAIM LP TOKENS ================================//

    function claim(address _pool) public {
        require(mapAddress_LockedLP[msg.sender].lockedLP > 0, 'must have locked lps');
        uint256 claimable = calcClaimableLockedLP(msg.sender); 
        require(claimable <= mapAddress_LockedLP[msg.sender].lockedLP,'attempted to overclaim');
        mapAddress_LockedLP[msg.sender].secondsSinceLastClaim = now;
        mapAddress_LockedLP[msg.sender].lockedLP = mapAddress_LockedLP[msg.sender].lockedLP.sub(claimable);
        iBEP20(_pool).transfer(msg.sender, claimable);
    }

    function calcClaimableLockedLP(address member) public view returns(uint256 claimAmount){
        uint256 secondsSinceClaim = now.sub(mapAddress_LockedLP[member].secondsSinceLastClaim); // Get time since last claim
        uint256 rate = mapAddress_LockedLP[member].claimRate;
        if(secondsSinceClaim >= 31536000){
            return mapAddress_LockedLP[member].lockedLP;
        }
        return secondsSinceClaim.mul(rate); 
    }
}