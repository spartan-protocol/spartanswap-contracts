// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

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
interface iBASE {
    function secondsPerEra() external view returns (uint256);
    function DAO() external view returns (iDAO);
}
interface iUTILS {
    function calcPart(uint bp, uint total) external pure returns (uint part);
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    function calcLiquidityShare(uint units, address token, address pool, address member) external pure returns (uint share);
    function calcSwapOutput(uint x, uint X, uint Y) external pure returns (uint output);
    function calcSwapFee(uint x, uint X, uint Y) external pure returns (uint output);
    function calcLiquidityUnits(uint b, uint B, uint t, uint T, uint P) external pure returns (uint units);
    function getPoolShare(address token, uint units) external view returns(uint baseAmount, uint tokenAmount);
    function getPoolShareAssym(address token, uint units, bool toBase) external view returns(uint baseAmount, uint tokenAmount, uint outputAmt);
    function calcValueInBase(address token, uint amount) external view returns (uint value);
    function calcValueInToken(address token, uint amount) external view returns (uint value);
    function calcValueInBaseWithPool(address pool, uint amount) external view returns (uint value);
    function calcAsymmetricShare(uint u, uint U, uint A) external view returns (uint value);
}
interface iDAO {
    function ROUTER() external view returns(address);
    function UTILS() external view returns(iUTILS);
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


contract Synthetics is iBEP20{

    using SafeMath for uint256;

    
    // ERC-20 Parameters
    string public override name; string public override symbol;
    uint256 public override decimals; uint256 public override totalSupply;

    // ERC-20 Mappings
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    address public BASE;
    address public ROUTER;
    address public burnAddress;
    uint256 public defaultCollateralisation;

    mapping(address => lpCDP) public mapAddress_lpCDP;
    //mapping(address => lpCDPMember) public mapAddress_lpCDPMember;

    struct lpCDP{
        address lpToken;
        uint debt;
        uint collateral;
        address [] members;
        mapping(address => uint) memberShare;
    }
   

    constructor (address _base, address _router) public payable {
        BASE = _base;
        ROUTER = _router;
        name = 'Synthentic sUSD';
        symbol = 'sUSD';
        decimals = 18;
        burnAddress = 0x000000000000000000000000000000000000dEaD;
        defaultCollateralisation = 150;
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
        _balances[sender] = _balances[sender].sub(amount, "iBEP20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }
    // Internal mint (upgrading and daily emissions)
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "iBEP20: mint to the zero address");
        totalSupply = totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }
    // Burn supply
    function burn(uint256 amount) public virtual {
        _burn(msg.sender, amount);
    }
    
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "iBEP20: burn from the zero address");
        _balances[account] = _balances[account].sub(amount, "iBEP20: burn amount exceeds balance");
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    function depositLP(address lptoken, uint amount) public payable returns (uint cdpShare){
        //get lp tokens
        //get lp value
        //check for member
        //calculate share - update share
        //add to mappings
        //mint sUSD value at default collateralisation
        //transfer msg.sender sUSD
        //return cdp share
        //emit event
        require(amount > 0, 'must get lp tokens');
        uint256 lpValue; uint256 asymAmount; uint256 lpTokenSupply; uint256 baseDepth;
        baseDepth = iBEP20(BASE).balanceOf(lptoken);
        lpTokenSupply = iBEP20(lptoken).totalSupply();
        asymAmount = _DAO().UTILS().calcAsymmetricShare(amount, lpTokenSupply, baseDepth);
        lpValue = _DAO().UTILS().calcValueInBase();

    }



    function withDrawLP(address lpCDP, uint withDrawBP) public payable returns (uint lpTokens){
        //require bp
        //transfer debt from msg.sender - delete
        //calculate amount to close
        //update sender mappings
        //update lpCDP mappings
        //transfer back lp tokens
        //emit event

    }

    function liquidate(address lpCDP, uint liquidateBP) public returns (bool success){
        //bp liquidation
        //if can liquidate 
        //require blocktime to be 4hrs later
        //small liquidations - need to run some simulations
        //calc how much to liquidate +fee
        //removeLiquidityAndSwap - output sparta
        //buy token from pool with sparta
        //delete
        //transfer sparta fee back to msg.sender
        //emit event
    }
    function _checkLiquidation(address lpCDP) public returns (bool canLiquidate){
        //check debt is less than lptoken value in mappings
        //return true or false
    }
    
   

}