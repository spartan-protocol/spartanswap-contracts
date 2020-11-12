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


    struct ListedAssets {
        bool isListed;
        address[] members;
        mapping(address => bool) isMember;
        mapping(address => uint256) lockedLP;
        mapping(address => uint256) claimRate;
        mapping(address => uint256) lastBlockTime;
    }
    struct MemberDetails {
        bool isMember;
        uint256 lockedLP;
        uint256 claimRate;
        uint256 lastBlockTime;
    }

 
  // Parameters
    address public BASE;
    address public ROUTER;
    address[] public arrayMembers;
    address public WBNB;
    address public DEPLOYER;
    address [] listedLockAssets;
    uint256 baseSupply;

    mapping(address => ListedAssets) public mapAddress_listedAssets;
    mapping(address => bool) public isListed;
    

    event ListedAsset(address indexed DEPLOYER, address indexed asset);
    event DepositAsset(address indexed owner, uint256 indexed depositAmount, uint256 indexed lockedLP);

    modifier onlyDeployer() {
        require(msg.sender == DEPLOYER, "Must be DAO");
        _;
    }

    //=====================================CREATION=========================================//
    // Constructor
    constructor(address _base, address _router, address _wbnb) public {
        BASE = _base;
        ROUTER = _router;
        WBNB = _wbnb;
        name = "lock-token";
        symbol  = "LTKN";
        decimals = 18;
        DEPLOYER = msg.sender;
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
        require(totalSupply >= 1, 'burnt already');
        _approve(address(this), BASE, totalSupply);
        iBASE(BASE).claim(address(this), totalSupply);
        totalSupply = totalSupply.sub(totalSupply);
        baseSupply = iBEP20(BASE).balanceOf(address(this));
        iBEP20(BASE).approve(ROUTER, baseSupply);
        return true;
    }

    function listLockAsset(address asset) public onlyDeployer returns (bool){
         if(!isListed[asset]){
            isListed[asset] = true;
            listedLockAssets.push(asset);
        }
        emit ListedAsset(msg.sender, asset);
        return true;
    }

     function deposit(address asset, uint amount) public payable returns (bool success) {
        require(amount > 0, 'must get asset');
        require(isListed[asset], 'must be listed');
        uint liquidityUnits; address _pool = _DAO().UTILS().getPool(asset);
        liquidityUnits = handleTransferIn(asset, amount);
        uint lpAdjusted = liquidityUnits.mul(5000).div(10000);
        if(!mapAddress_listedAssets[asset].isMember[msg.sender]){
          mapAddress_listedAssets[asset].isMember[msg.sender] = true;
          arrayMembers.push(msg.sender);
          mapAddress_listedAssets[asset].members.push(msg.sender);
        }
        mapAddress_listedAssets[asset].lockedLP[msg.sender] = mapAddress_listedAssets[asset].lockedLP[msg.sender].add(lpAdjusted);
        mapAddress_listedAssets[asset].lastBlockTime[msg.sender] = now;
        mapAddress_listedAssets[asset].claimRate[msg.sender] = mapAddress_listedAssets[asset].lockedLP[msg.sender].div(31536000);//12months 31536000
        iBEP20(_pool).transfer(msg.sender, lpAdjusted);
        emit DepositAsset(msg.sender, amount, lpAdjusted);
        return true;
    }

    function handleTransferIn(address _token, uint _amount) internal returns (uint LPunits){
        uint spartaAllocation;
        spartaAllocation = _DAO().UTILS().calcValueInBase(_token, _amount);
        if(_token == address(0)){
                // If BNB, then send to WBNB contract, then forward WBNB to pool
                require((_amount == msg.value), "InputErr");
                payable(WBNB).call{value:_amount}(""); 
                iBEP20(WBNB).transfer(address(this), _amount);
                iBEP20(WBNB).approve(ROUTER, _amount); 
                LPunits = iROUTER(ROUTER).addLiquidity(spartaAllocation, _amount, WBNB);
            } else {
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount);
                if(iBEP20(_token).allowance(address(this), ROUTER) < _amount){
                    uint256 approvalTNK = iBEP20(_token).totalSupply();  
                    iBEP20(_token).approve(ROUTER, approvalTNK);  
                }
                LPunits = iROUTER(ROUTER).addLiquidity(spartaAllocation, _amount, _token);
            }
    }
    //============================== CLAIM LP TOKENS ================================//

    function claim(address asset) public returns(bool){
        require(mapAddress_listedAssets[asset].lockedLP[msg.sender] > 0, 'must have locked lps');
        require(mapAddress_listedAssets[asset].isMember[msg.sender], 'must have deposited first');
        uint256 claimable = calcClaimLockedLP(msg.sender, asset); 
        address _pool = _DAO().UTILS().getPool(asset);
        require(claimable <= mapAddress_listedAssets[asset].lockedLP[msg.sender],'attempted to overclaim');
        mapAddress_listedAssets[asset].lastBlockTime[msg.sender] = now;
        mapAddress_listedAssets[asset].lockedLP[msg.sender] = mapAddress_listedAssets[asset].lockedLP[msg.sender].sub(claimable);
        iBEP20(_pool).transfer(msg.sender, claimable);
        return true;
    }
    

    function calcClaimLockedLP(address lockMember, address asset) public returns (uint256 claimAmount){
        uint256 secondsSinceClaim = now.sub(mapAddress_listedAssets[asset].lastBlockTime[lockMember]); // Get time since last claim
        uint256 rate = mapAddress_listedAssets[asset].claimRate[lockMember];
        if(secondsSinceClaim >= 31536000){
            mapAddress_listedAssets[asset].claimRate[lockMember] = 0;
            claimAmount = mapAddress_listedAssets[asset].lockedLP[lockMember];
        }else{
            claimAmount = secondsSinceClaim.mul(rate);
        }
        return claimAmount; 
    }



    //============================== HELPERS ================================//

    function getMemberDetails(address member, address asset) public view returns (MemberDetails memory memberDetails){
        memberDetails.isMember = mapAddress_listedAssets[asset].isMember[member];
        memberDetails.lockedLP = mapAddress_listedAssets[asset].lockedLP[member];
        memberDetails.claimRate = mapAddress_listedAssets[asset].claimRate[member];
        memberDetails.lastBlockTime = mapAddress_listedAssets[asset].lastBlockTime[member];
        return memberDetails;
    }
}