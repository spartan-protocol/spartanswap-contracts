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
    function getPool(address token) external returns(address pool);
    function calcAsymmetricShare(uint u, uint U, uint A) external view returns (uint value);
    function calcBasePPinTokenWithPool(address pool, uint amount)external view returns (uint value);
    function calcValueInTokenWithPool(address pool, uint amount) external view returns (uint value);
}
interface iROUTER {
    function addLiquidity(uint inputBase, uint inputToken, address token) external payable returns (uint units);
    function removeLiquidityExactAndSwap(uint units, bool toBase, address token) external returns (uint outputAmount);
}
interface iDAO {
    function ROUTER() external view returns(iROUTER);
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
    uint256 public sUSDprice;
    uint256 public baseGenesisPrice;

    struct LPCDPDetails{
        uint256 debt;
        uint256 collateral;
        address [] members;
    }
    struct MemberShare{
        address lpTKNAddress;
        uint256 share;
    }

    mapping(address => LPCDPDetails) public mapAddress_LPCDPDetails;
    mapping(address => uint256) public mapAddress_cdpTier;
    mapping(address => uint256) public mapAddress_debt;
    mapping(address => uint256) public mapAddress_collateral;
    mapping(address => address[]) public mapAddress_members;
    mapping(address => uint256) public mapAddress_memberShare;
    // mapping(address => MemberShare)public mapAddress_
     mapping(address => bool) public mapAddress_isMember;

    event AddLPCollateral(address indexed member, uint256 indexed lpAmount, address indexed lpCDPAddress);

    constructor (address _base, address _router, address lpTKN, uint256 initLp) public payable {
        BASE = _base;
        ROUTER = _router;
        name = 'Synthentic USD';
        symbol = 'sUSD';
        decimals = 18;
        sUSDprice = 1*10**18;
        baseGenesisPrice = 5*10**16;
        //send in sparta, create sUSD pool using gensis prices
        
        burnAddress = 0x000000000000000000000000000000000000dEaD;
        defaultCollateralisation = 200;
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
    // Internal mint 
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

    function depositLP(address lpToken, uint amount, uint cdpTier) public payable returns (uint cdpShare){
        require(amount > 0, 'must get lp tokens');
        require((cdpTier == 200 || cdpTier == 150 || cdpTier == 125), 'cdpTier must exist');//only 3 tiers
        uint256 sUSDValue; uint256 asymBase; uint256 sUSDLPtkn;  
        uint256 lpAdjusted; address _pool;

        iBEP20(lpToken).transferFrom(msg.sender, address(this), amount); //get lpTokens from sender
        lpAdjusted = amount.mul(10000).div(20000);// cdp tiers later development 
        _pool = _DAO().UTILS().getPool(address(this)); //sUSD pool created in constructor
        asymBase = iROUTER(ROUTER).removeLiquidityExactAndSwap(lpAdjusted,true,lpToken);//go get asym sparta
        sUSDValue = _DAO().UTILS().calcValueInTokenWithPool(_pool, asymBase); //get value of asymBase
        _mint(address(this), sUSDValue); // mint equivilant sparta values
        _approve(address(this), ROUTER, sUSDValue);//approve router to spend sUSD for lp into sUSD:Sparta pools
        sUSDLPtkn = iROUTER(ROUTER).addLiquidity(asymBase, sUSDValue, address(this)); // add liquidity into sparta : sUSD
        iBEP20(_pool).transfer(msg.sender, sUSDLPtkn);
        emit AddLPCollateral(msg.sender, amount, lpToken);
        //cdpShare = added value - get share
        if(mapAddress_isMember[msg.sender]){
            //add member share
            
        }else{
            mapAddress_isMember[msg.sender] = true;
            //fix mappings
        }







    }



    function withDrawLP(address lpCDP, uint withDrawBP) public payable returns (uint lpTokens){
        //require withDrawBP
        //transfer debt from msg.sender - delete
        //calculate amount to close
        //update sender mappings
        //update lpCDP mappings
        //transfer back lp tokens
        //emit event

    }

    function liquidate(address lpCDP, uint liquidateBP) public returns (bool success){
        //bp liquidation
        //check if can liquidate 
        //require blocktime to be 4hrs later
        //small liquidations - need to run some simulations
        //calc how much to liquidate +fee
        //asym output sparta using lp tokens
        //buy sUSD 
        //calc fee is sUSD
        //transfer sUSD fee back to msg.sender
        //delete the rest of sUSD
        //emit event
    }
    function _checkLiquidation(address lpCDP) public returns (bool canLiquidate){
        //check debt is less than lptoken value in mappings
        //return true or false
    }
    
   

}