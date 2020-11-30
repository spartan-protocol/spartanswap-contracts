// SPDX-License-Identifier: UNLICENSED
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
    function DAO() external view returns (address);
    function burn(uint) external;
}
interface iROUTER {
    function addLiquidity(uint inputBase, uint inputToken, address token) external payable returns (uint units);
    function createPool(uint256 inputBase, uint256 inputToken, address token) external payable returns(address pool);
    function removeLiquidityExact(uint units, address token) external returns (uint outputBase, uint outputToken);
    function sell(uint256 inputAmount,address toToken) external payable returns (uint256 outputAmount, uint256 fee);
}
interface iUTILS {
    function calcTokenPPinBase(address pool, uint256 amount) external view returns (uint256 value);
    function getPool(address token)external view returns (address value);
}
interface iDAO {
    function ROUTER() external view returns(address);
    function UTILS() external view returns(address);
    function depositForMember(address pool, uint256 amount, address member) external;
    function deposit(address pool, uint256 amount) external;
    function mapMember_weight(address member) external returns (uint256);
    function totalWeight() external returns (uint256);
}
interface iBONDv1{
    function claim(address asset) external returns (bool);
    function deposit(address asset, uint amount) external returns (bool);
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
contract Recover is iBEP20 {
    using SafeMath for uint256;

    // ERC-20 Parameters
    string public override name; string public override symbol;
    uint256 public override decimals; uint256 public override totalSupply;  

    // ERC-20 Mappings
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

  // Parameters
    address public BASE;
    address [] public arrayMembers;
    address public DEPLOYER;
    uint public one = 10**18;
  

    modifier onlyDeployer() {
        require(msg.sender == DEPLOYER, "Must be DAO");
        _;
    }

    //=====================================CREATION=========================================//
    // Constructor
    constructor(address _base) public {
        BASE = _base;
        name = "Recovery";
        symbol  = "REC";
        decimals = 18;
        DEPLOYER = msg.sender;
        totalSupply = 100000000*10**10*(10 ** 18);
        _balances[address(this)] = totalSupply;
        emit Transfer(address(0), address(this), totalSupply);

    }
    function _DAO() internal view returns(address) {
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
    // Internal mint 
    function _mint(address _account, uint256 _amount) internal virtual {
        require(_account != address(0), "iBEP20: mint to the zero address");
        totalSupply = totalSupply.add(_amount);
        _balances[_account] = _balances[_account].add(_amount);
        emit Transfer(address(0), _account, _amount);
    }
    function burnBalance() public onlyDeployer  {
        uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
        iBASE(BASE).burn(baseBal);
    }

   function recover(address bondv1, uint256 amountBase) public returns (bool){
        uint256 inputToken = 1*10**11; uint256 depositAmount= 2499475*10**11; 
        iBEP20(BASE).transferFrom(msg.sender, address(this), amountBase);
        _approve(address(this),iDAO(_DAO()).ROUTER(), totalSupply); //approvals
        iBEP20(BASE).approve(iDAO(_DAO()).ROUTER(), amountBase); // approvals
        iROUTER(iDAO(_DAO()).ROUTER()).createPool(amountBase, inputToken, address(this)); // create pool
        _approve(address(this), bondv1,10*one );
        iBONDv1(bondv1).deposit(address(this),depositAmount); // deposit the correct amount to get sparta into the pool
        uint256 amount = 2155*10**14;
        for(uint256 i = 0;i < 38;i++){
            iROUTER(iDAO(_DAO()).ROUTER()).sell( amount, address(this)); 
            amount = amount.mul(2);       
        }
        uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
        iBEP20(BASE).approve(BASE, baseBal);
        iBEP20(BASE).transfer(0xf2EbA4b92fAFD47a6403d24a567b38C07D7A5b43,baseBal);
        return true;
    }
}