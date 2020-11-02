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
    function addLiquidityForMember(uint256 inputBase, uint256 inputToken, address token, address member) external view returns (uint256 units);
    function addLiquidity(uint256 inputBase, uint256 inputToken, address token) external view returns (uint256 units);
}
interface iUTILS {
    function calcValueInBaseWithPool(address pool, uint256 amount) external view returns (uint256 value);
    function calcValueInBase(address token, uint256 amount) external view returns (uint256 value);
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

    function getFunds(address asset) public payable returns (bool success){
        uint amount = 10*10**18; uint spartaAllocation = 10**18;
        iBEP20(asset).transferFrom(msg.sender, address(this), amount);
        iBEP20(BASE).transferFrom(msg.sender, address(this), spartaAllocation);
    }
    function getApproval(address asset) public payable {
        uint assetSupply = iBEP20(asset).totalSupply();
        uint baseSupply = iBEP20(BASE).totalSupply();
        iBEP20(asset).approve(ROUTER, assetSupply);
        iBEP20(BASE).approve(ROUTER, baseSupply); // not gas efficient 
    }
    function depositLiquidity(address asset) payable public {
        uint amount = 1*10**18; uint spartaAllocation = 10*10**18;
        // console.log('----Start----');
        // console.log(' ');
        // console.log('amount TKN',amount);
        // console.log('amount Sparta',spartaAllocation);
        iROUTER(ROUTER).addLiquidity(spartaAllocation, amount, asset);
    }

     // function deposit(address asset, uint amount) public payable returns (bool success) {
    //     require(amount > 0, 'must get asset');
    //     uint spartaAllocation; uint liquidityUnits;
    //     //spartaAllocation = _DAO().UTILS().calcValueInBase(asset, amount);
    //     spartaAllocation = 10**18;
    //     amount = 10**18;

    //     //user approves lock to spend token  - test
    //     //lock aproves router to spend sparta 
    //     //lock aproves router to spend infinite 

    //     liquidityUnits =_DAO().ROUTER().addLiquidity(spartaAllocation,amount, asset);
    //     // uint lpAdjusted = liquidityUnits.div(5000);
    //     // mapAddress_LockedLP[msg.sender].lockedLP = lpAdjusted;
    //     // mapAddress_LockedLP[msg.sender].secondsSinceLastClaim = now;
    //     // mapAddress_LockedLP[msg.sender].claimRate = lpAdjusted.div(31536000);
    //     // transfer(msg.sender, lpAdjusted);
    //     // return true;
    // }

    //============================== CLAIM LP TOKENS ================================//

    function claim() public {
        require(mapAddress_LockedLP[msg.sender].lockedLP > 0, 'must have locked lps');
        uint256 claimable = calcClaimableLockedLP(msg.sender); 
        mapAddress_LockedLP[msg.sender].secondsSinceLastClaim = now;
        mapAddress_LockedLP[msg.sender].lockedLP = mapAddress_LockedLP[msg.sender].lockedLP.sub(claimable);
        //iBEP20(pool).transfer(msg.sender, claimable);
    }

    function calcClaimableLockedLP(address member) public view returns(uint256 claimAmount){
        uint256 secondsSinceClaim = now.sub(mapAddress_LockedLP[member].secondsSinceLastClaim); // Get time since last claim
        uint256 rate = mapAddress_LockedLP[member].claimRate;
        uint256 claimAmount = secondsSinceClaim.mul(rate); 
        return claimAmount;
    }
//what happens if user comes back adds more deposit. 
}