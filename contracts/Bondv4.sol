// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import "./cInterfaces.sol";
import "@nomiclabs/buidler/console.sol";
interface iBASE {
    function DAO() external view returns (iDAO);
    function burn(uint) external;
    function claim(address asset, uint256 amount) external payable;  
}
interface iDAO {
     function ROUTER() external view returns(address);
     function UTILS() external view returns(address);
     function DAO() external view returns (address);
     function MSTATUS() external view returns(bool);
     function POOLFACTORY() external view returns(address);
     function depositForMember(address pool, uint256 amount, address member) external;
}
interface iNDAO {
    function DAO() external view returns (iDAO);
 
}
interface iROUTER {
    function addLiquidity(uint inputBase, uint inputToken, address token) external payable returns (uint units);
}
interface iUTILS {
    function calcSwapValueInBase(address pool, uint256 amount) external view returns (uint256 value);
}
interface iPOOL {
    function TOKEN() external view returns(address);
}
interface iPOOLFACTORY {
    function getPool(address token) external returns (address);
}




    //======================================SPARTA=========================================//
contract Bond is iBEP20 {
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
        mapping(address => uint256) bondedLP;
        mapping(address => uint256) claimRate;
        mapping(address => uint256) lastBlockTime;
    }
    struct MemberDetails {
        bool isMember;
        uint256 bondedLP;
        uint256 claimRate;
        uint256 lastBlockTime;
    }

  // Parameters
    address public BASE;
    address public WBNB;
      address private NDAO;
    address [] public arrayMembers;
    address public DEPLOYER;
    uint public one = 10**18;
    address [] listedBondAssets;
    uint256 public bondingPeriodSeconds = 31536000;
    uint256 private basisPoints = 10000;
    uint256 public totalWeight;


    mapping(address => ListedAssets) public mapAddress_listedAssets;
    mapping(address => bool) public isListed;

    event ListedAsset(address indexed DAO, address indexed asset);
    event DelistedAsset(address indexed DAO, address indexed asset);
    event DepositAsset(address indexed owner, uint256 indexed depositAmount, uint256 indexed bondedLP);
    
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _;
    }

    modifier onlyDEPLOYER() {
        require(msg.sender == DEPLOYER );
        _;
    }

    //=====================================CREATION=========================================//
    // Constructor
    constructor(address _base, address _wbnb, address _newDao) public {
        BASE = _base;
        WBNB = _wbnb;
        NDAO = _newDao;
        name = "SpartanBondTokenV4";
        symbol  = "SPT-BOND-V4";
        decimals = 18;
        DEPLOYER = msg.sender;
        totalSupply = 1 * (10 ** 18);
        _balances[address(this)] = totalSupply;
        emit Transfer(address(0), address(this), totalSupply);
    }
    function _DAO() internal view returns(iDAO) {
        bool status = iDAO(NDAO).MSTATUS();
        if(status == true){
         return iBASE(BASE).DAO();
        }else{
          return iNDAO(NDAO).DAO();
        }
    }
    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
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
     function burnFrom(address from, uint256 value) public virtual override {
        require(value <= _allowances[from][msg.sender], 'AllowanceErr');
        _allowances[from][msg.sender] -= value;
        _burn(from, value);
    }
    function _burn(address account, uint256 amount) internal virtual {
        _balances[account] = _balances[account].sub(amount, "BalanceErr");
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    //================================MIGRATION==============================//
    function migrateMemberDetails(address member, address asset, address oldBond) public onlyDEPLOYER returns (bool){
        MemberDetails memory memberDetails = Bond(oldBond).getMemberDetails(member, asset);
        mapAddress_listedAssets[asset].isMember[member] = memberDetails.isMember;
        mapAddress_listedAssets[asset].bondedLP[member] = memberDetails.bondedLP;
        mapAddress_listedAssets[asset].claimRate[member] = memberDetails.claimRate;
        mapAddress_listedAssets[asset].lastBlockTime[member] = memberDetails.lastBlockTime;
        return true;
    }
    


    //====================================ONLY DAO================================//
    function listBondAsset(address asset) public onlyDAO returns (bool){
         if(!isListed[asset]){
            isListed[asset] = true;
            listedBondAssets.push(asset);
        }
        emit ListedAsset(msg.sender, asset);
        return true;
    }
    function delistBondAsset(address asset) public onlyDAO returns (bool){
            isListed[asset] = false;
        emit DelistedAsset(msg.sender, asset);
        return true;
    }
    function changeBondingPeriod(uint256 bondingSeconds) public onlyDAO returns (bool){
        bondingPeriodSeconds = bondingSeconds;
        return true;
    }
    function burnBalance() public onlyDAO returns (bool){
        uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
        iBASE(BASE).burn(baseBal); 
        return true;
    }
    function mintBond() public onlyDAO returns (bool) {
        require(iBEP20(BASE).balanceOf(address(this)) <= 10*one, "!SPARTA");
        require(totalSupply <= 0, 'mintBONDerr');
        uint256 amount =1*10**18;
        _mint(address(this), amount);
       return true;
    }
    function moveBondBASEBalance(address newBond) public onlyDAO returns(bool){
         uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
         iBEP20(BASE).transfer(newBond, baseBal);
         return true;
    }
    function moveBondLPS(address asset, address newBond) public onlyDAO returns(bool){
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset);
         uint256 poolBal = iBEP20(_pool).balanceOf(address(this));
         iBEP20(BASE).transfer(newBond, poolBal);
         return true;
    }
    function approveRouter() public returns (bool){
       uint256 baseSupply = iBEP20(BASE).balanceOf(address(this));
        iBEP20(BASE).approve(_DAO().ROUTER(), baseSupply);
        return true;
    }

     //================================ BOND Feature ==================================//
    function burnBond() public onlyDAO returns (bool success){
        require(totalSupply > 0, '!Available');
        _approve(address(this), BASE, totalSupply);
        iBASE(BASE).claim(address(this), totalSupply);
        totalSupply = totalSupply.sub(totalSupply);
        approveRouter();
        return true;
    }
    function deposit(address asset, uint256 amount) public payable returns (bool success) {
        require(amount > 0, '!asset');
        require(isListed[asset], '!listed');
        uint256 liquidityUnits = handleTransferIn(asset, amount);
        if(!mapAddress_listedAssets[asset].isMember[msg.sender]){
          mapAddress_listedAssets[asset].isMember[msg.sender] = true;
          arrayMembers.push(msg.sender);
          mapAddress_listedAssets[asset].members.push(msg.sender);
        }
        if(mapAddress_listedAssets[asset].bondedLP[msg.sender] > 0){
            claimForMember(asset, msg.sender);
        }
        mapAddress_listedAssets[asset].bondedLP[msg.sender] = mapAddress_listedAssets[asset].bondedLP[msg.sender].add(liquidityUnits);
        mapAddress_listedAssets[asset].lastBlockTime[msg.sender] = block.timestamp;
        mapAddress_listedAssets[asset].claimRate[msg.sender] = mapAddress_listedAssets[asset].bondedLP[msg.sender].div(bondingPeriodSeconds);
        emit DepositAsset(msg.sender, amount, liquidityUnits);
        return true;
    }
    function depositInit(address lptoken, uint256 amount, address member) public onlyDAO returns (bool success) {
       iBEP20(lptoken).transferFrom(msg.sender, address(this), amount);
       address asset = iPOOL(lptoken).TOKEN();
        if(asset == WBNB){
           asset = address(0);
        }
        if(!mapAddress_listedAssets[asset].isMember[member]){
          mapAddress_listedAssets[asset].isMember[member] = true;
          arrayMembers.push(member);
          mapAddress_listedAssets[asset].members.push(member);
        }
        mapAddress_listedAssets[asset].bondedLP[member] = mapAddress_listedAssets[asset].bondedLP[member].add(amount);
        mapAddress_listedAssets[asset].lastBlockTime[member] = block.timestamp;
        mapAddress_listedAssets[asset].claimRate[member] = mapAddress_listedAssets[asset].bondedLP[member].div(23328000);
        return true;
    }

    function handleTransferIn(address _token, uint _amount) internal returns (uint LPunits){
        uint256 spartaAllocation = iUTILS(_DAO().UTILS()).calcSwapValueInBase(_token, _amount); 
        if(_token == address(0)){
                require((_amount == msg.value), "InputErr");
                LPunits = iROUTER(_DAO().ROUTER()).addLiquidity{value:_amount}(spartaAllocation, _amount, _token);
            } else {
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount);
                if(iBEP20(_token).allowance(address(this), iDAO(_DAO()).ROUTER()) < _amount){
                    uint256 approvalTNK = iBEP20(_token).totalSupply();  
                    iBEP20(_token).approve(_DAO().ROUTER(), approvalTNK);  
                }
                LPunits = iROUTER(_DAO().ROUTER()).addLiquidity(spartaAllocation, _amount, _token);
            } 
    }
    function claimAllForMember(address member) public returns (bool){
        address [] memory listedAssets = listedBondAssets;
        for(uint i =0; i<listedAssets.length; i++){
            uint claimA = calcClaimBondedLP(member,listedAssets[i]);
            if(claimA>0){
                claimForMember(listedAssets[i],member);
            }
        }
        return true;
    }
    function claimForMember(address asset, address member) public returns (bool){
        require(mapAddress_listedAssets[asset].bondedLP[member] > 0, '!bondedlps');
        require(mapAddress_listedAssets[asset].isMember[member], '!deposited');
        uint256 claimable = calcClaimBondedLP(member, asset); 
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset);
        require(claimable <= mapAddress_listedAssets[asset].bondedLP[member],'attempted to overclaim');
        mapAddress_listedAssets[asset].lastBlockTime[member] = block.timestamp;
        mapAddress_listedAssets[asset].bondedLP[member] = mapAddress_listedAssets[asset].bondedLP[member].sub(claimable);
        iBEP20(_pool).transfer(member, claimable); // send LPs to user
        return true;
    }
    function calcClaimBondedLP(address bondedMember, address asset) public returns (uint){
        require(isListed[asset], '!listed');
        uint256 secondsSinceClaim = block.timestamp.sub(mapAddress_listedAssets[asset].lastBlockTime[bondedMember]); // Get time since last claim
        uint256 rate = mapAddress_listedAssets[asset].claimRate[bondedMember];
        uint claimAmount;
        if(secondsSinceClaim >= bondingPeriodSeconds){
            mapAddress_listedAssets[asset].claimRate[bondedMember] = 0;
            claimAmount = mapAddress_listedAssets[asset].bondedLP[bondedMember];
        }else {
            claimAmount = secondsSinceClaim.mul(rate);
        }
        return claimAmount;
    }

    //============================== HELPERS ================================//
    function assetListedCount() public view returns (uint256 count){
        return listedBondAssets.length;
    }
    function allListedAssets() public view returns (address[] memory _allListedAssets){
        return listedBondAssets;
    }
    function memberCount() public view returns (uint256 count){
        return arrayMembers.length;
    }
    function allMembers() public view returns (address[] memory _allMembers){
        return arrayMembers;
    }
    function getMemberDetails(address member, address asset) public view returns (MemberDetails memory memberDetails){
        memberDetails.isMember = mapAddress_listedAssets[asset].isMember[member];
        memberDetails.bondedLP = mapAddress_listedAssets[asset].bondedLP[member];
        memberDetails.claimRate = mapAddress_listedAssets[asset].claimRate[member];
        memberDetails.lastBlockTime = mapAddress_listedAssets[asset].lastBlockTime[member];
        return memberDetails;
    }
    
      function destroyMe() public onlyDEPLOYER {
         selfdestruct(msg.sender);
    }
    
}