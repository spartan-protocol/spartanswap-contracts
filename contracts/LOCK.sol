// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;

interface iBEP20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
interface iROUTER {
    function addLiquidityForMember(uint inputBase, uint inputToken, address token, address member) external view returns (uint units);
    function addLiquidity(uint inputBase, uint inputToken, address token) external view returns (uint units);
}
interface iUTILS {
    function calcValueInBaseWithPool(address pool, uint amount) external view returns (uint value);
    function calcValueInBase(address token, uint amount) external view returns (uint value);
}
interface iDAO {
    function ROUTER() external view returns(iROUTER);
    function UTILS() external view returns(iUTILS);
}
interface iBASE {
    function claim(address asset, uint amount) external payable;  
    function DAO() external view returns (iDAO);
}


// SafeMath
library SafeMath {

    function add(uint256 a, uint256 b) internal pure returns (uint256)   {
        uint256 c = a + b;
        assert(c >= a);
        return c;
    }

    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        require(c / a == b, "SafeMath");
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath");
    }
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath");
    }
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        return c;
    }
}

contract Lock is iBEP20 {
    using SafeMath for uint;

    string public override name;                                         // Name of Coin
    string public override symbol;                                       // Symbol of Coin
    uint public override decimals  = 18;                              // Decimals
    uint public override totalSupply = 1 * (10 ** decimals);   // 1 Total
    
    // Parameters
    address public BASE;
    address public ROUTER;
    address public WBNB;
    // ERC-20 Mappings
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => LockedLP) public mapAddress_LockedLP;

    struct LockedLP{
        uint lockedLP;
        uint claimRate;
        uint secondsSinceLastClaim;
    }


    // Events
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint256 value);   
 
    
    // Mint BEP20 
    constructor(address _base, address _router, address _wbnb) public{
        BASE = _base;
        ROUTER = _router;
        WBNB = _wbnb;
        name = "lock-token";
        symbol  = "LTKN";
        _balances[address(this)] = totalSupply;
        emit Transfer(address(0), address(this), totalSupply);
    }
    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }
     function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function transfer(address to, uint value) public override returns (bool success) {
        _transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "iERC20: approve from the zero address");
        require(spender != address(0), "iERC20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function transferFrom(address from, address to, uint value) public override returns (bool success) {
        require(value <= _allowances[from][msg.sender], 'need allowance');
        _allowances[from][msg.sender] -= value;
        _transfer(from, to, value);
        return true;
    }
   
    function _transfer(address _from, address _to, uint _value) internal {
        require(_to != address(0));
        require(_balances[_from] >= _value);
        require(_balances[_to].add(_value) >= _balances[_to]);       
        _balances[_from] = _balances[_from].sub(_value);          
        _balances[_to] = _balances[_to].add(_value);        
        emit Transfer(_from, _to, _value);          
    }


    //==================================================================================//
    //Use deposits asset -> mint lock token -> send to base for claim - receives back sparta 
    //first whitelist lock_token + claim rate 
    //mint lock token - transfer to base claim 

    function burn() public returns (bool success){
        _approve(address(this), BASE, totalSupply);
        iBASE(BASE).claim(address(this), totalSupply);
        totalSupply = totalSupply.sub(totalSupply);
        return true;
    }

    function deposit(address asset, uint amount) public payable returns (bool success) {
        require(amount > 0, 'must get asset');
        uint spartaAllocation; uint liquidityUnits;
        spartaAllocation = _DAO().UTILS().calcValueInBase(asset, amount);
        liquidityUnits =_DAO().ROUTER().addLiquidityForMember(spartaAllocation, amount, asset, msg.sender);
        uint lpAdjusted = liquidityUnits.div(5000);
        mapAddress_LockedLP[msg.sender].lockedLP = lpAdjusted;
        mapAddress_LockedLP[msg.sender].secondsSinceLastClaim = now;
        mapAddress_LockedLP[msg.sender].claimRate = lpAdjusted.div(31536000);
        iBEP20(ROUTER).transferFrom(address(this), msg.sender, lpAdjusted);
        return true;
    }

    //============================== CLAIM LP TOKENS ================================//

    function claim() public {
        require(mapAddress_LockedLP[msg.sender].lockedLP > 0, 'must have locked lps');
        uint claimable = calcClaimableLockedLP(msg.sender); 
        mapAddress_LockedLP[msg.sender].secondsSinceLastClaim = now;
        mapAddress_LockedLP[msg.sender].lockedLP = mapAddress_LockedLP[msg.sender].lockedLP.sub(claimable);
        iBEP20(ROUTER).transferFrom(address(this), msg.sender, claimable);
    }

    function calcClaimableLockedLP(address member) public view returns(uint){
        uint secondsSinceClaim = now.sub(mapAddress_LockedLP[member].secondsSinceLastClaim); // Get time since last claim
        uint rate = mapAddress_LockedLP[member].claimRate;
        uint claimAmount = secondsSinceClaim.mul(rate); 
        return claimAmount;
    }

  
    
}