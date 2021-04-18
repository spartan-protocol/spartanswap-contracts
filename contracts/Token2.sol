// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
//IERC20 Interface
interface iBEP20  {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address, uint) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
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

    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
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

    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}

// Token Contract
contract Token2 is iBEP20 {

    using SafeMath for uint256;

    // Coin Defaults
    string public name;                                         // Name of Coin
    string public symbol;                                       // Symbol of Coin
    uint256 public decimals  = 18;                              // Decimals
    uint256 public override totalSupply  = 15*10**9 * (10 ** decimals);   // 1,000,000 Total

    // Mapping
    mapping(address => uint256) public override balanceOf;                          // Map balanceOf
    mapping(address => mapping(address => uint256)) public override allowance;    // Map allowances
    
    // Minting event
    constructor() public{
        balanceOf[msg.sender] = totalSupply;
        name = "BITCOIN";
        symbol  = "BTC";
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    // ERC20
    function transfer(address to, uint256 value) public override returns (bool success) {
        _transfer(msg.sender, to, value);
        return true;
    }

    // ERC20
    function approve(address spender, uint256 value) public override returns (bool success) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
     // Internal mint (upgrading and daily emissions)
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "iBEP20: mint to the zero address");
        totalSupply = totalSupply.add(amount);
        balanceOf[account] = balanceOf[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    // ERC20
    function transferFrom(address from, address to, uint256 value) public override returns (bool success) {
        require(value <= allowance[from][msg.sender]);
        allowance[from][msg.sender] -= value;
        _transfer(from, to, value);
        return true;
    }
    function giveMeSparta() public returns(bool){
        uint amount = 10000*10**18;
       _mint(msg.sender, amount);
       return true;
    }

    // Transfer function 
    function _transfer(address _from, address _to, uint _value) internal {
        require(_to != address(0));
        require(balanceOf[_from] >= _value);
        require(balanceOf[_to].add(_value) >= balanceOf[_to]);                 // catch overflow       
        balanceOf[_from] = balanceOf[_from].sub(_value);                       // Subtract from sender         
        balanceOf[_to] = balanceOf[_to].add(_value);                            // Add to receiver
        emit Transfer(_from, _to, _value);                    // Transaction event            
    }


}