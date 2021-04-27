// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iBEP20.sol";
import "./BondVault.sol";


    //======================================SPARTA=========================================//
contract Bond is iBEP20 {
    // ERC-20 Parameters
    string public override name; string public override symbol;
    uint256 public override decimals; uint256 public override totalSupply;  

    // ERC-20 Mappings
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;


  // Parameters
    address public BASE;
    address public bondVault;
    address public WBNB;
    address private NDAO;
    address public DEPLOYER;
    uint public one = 10**18;
    address [] listedBondAssets;
    uint256 public bondingPeriodSeconds = 31104000;//update for mainnet

    mapping(address => bool) public isListed;

    event ListedAsset(address indexed DAO, address indexed asset);
    event DelistedAsset(address indexed DAO, address indexed asset);
    event DepositAsset(address indexed owner, uint256 depositAmount, uint256 bondedLP);
    
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _;
    }

    //=====================================CREATION=========================================//
    // Constructor
    constructor(address _base, address _wbnb, address _newDao, address _bondVault) public {
        BASE = _base;
        WBNB = _wbnb;
        NDAO = _newDao;
        bondVault = _bondVault;
        name = "SpartanBondTokenV4";
        symbol  = "SP-BOND-V4";
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
    function changeNDAO(address newDAO) public onlyDAO {
        NDAO = newDAO;
    }
     function setAddress(address _bondVault) public onlyDAO {
        bondVault = _bondVault;
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
        _approve(msg.sender, spender, _allowances[msg.sender][spender]+(addedValue));
        return true;
    }
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender]-(subtractedValue));
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
        _approve(sender, msg.sender, _allowances[sender][msg.sender]-(amount));
        return true;
    }

    // Internal transfer function
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "iBEP20: transfer from the zero address");
        _balances[sender] -= amount;
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }
    // Internal mint 
    function _mint(address _account, uint256 _amount) internal virtual {
        require(_account != address(0), "iBEP20: mint to the zero address");
        totalSupply +=_amount;
        _balances[_account] += _amount;
        emit Transfer(address(0), _account, _amount);
    }
     function burnFrom(address from, uint256 value) public virtual override {
        require(value <= _allowances[from][msg.sender], 'AllowanceErr');
        _allowances[from][msg.sender] -= value;
        _burn(from, value);
    }
    function _burn(address account, uint256 amount) internal virtual {
        _balances[account] -= amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }
  

    //====================================ONLY DAO================================//
    function listBondAsset(address asset) external onlyDAO returns (bool){
         if(!isListed[asset]){
            isListed[asset] = true;
            listedBondAssets.push(asset);
        }
        emit ListedAsset(msg.sender, asset);
        return true;
    }
    function delistBondAsset(address asset) external onlyDAO returns (bool){
            isListed[asset] = false;
        emit DelistedAsset(msg.sender, asset);
        return true;
    }
    function changeBondingPeriod(uint256 bondingSeconds) external onlyDAO returns (bool){
        bondingPeriodSeconds = bondingSeconds;
        return true;
    }
    function burnBalance() external onlyDAO returns (bool){
        uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
        iBASE(BASE).burn(baseBal); 
        return true;
    }
    function mintBond() external onlyDAO returns (bool) {
        require(iBEP20(BASE).balanceOf(address(this)) <= 10*one, "!SPARTA");
        require(totalSupply <= 0, 'mintBONDerr');
        uint256 amount =1*10**18;
        _mint(address(this), amount);
       return true;
    }
    function moveBondBASEBalance(address newBond) external onlyDAO returns(bool){
         uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
         iBEP20(BASE).transfer(newBond, baseBal);
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
        totalSupply = totalSupply-(totalSupply);
        approveRouter();
        return true;
    }
    function deposit(address asset, uint256 amount) external payable returns (bool success) {
        require(amount > 0, '!asset');
        require(isListed[asset], '!listed');
        uint256 liquidityUnits = handleTransferIn(asset, amount);
        BondVault(bondVault).depForMember(asset, msg.sender, liquidityUnits);
        emit DepositAsset(msg.sender, amount, liquidityUnits);
        return true;
    }
    function depositInit(address lptoken, uint256 amount, address member) external onlyDAO returns (bool success) {
       iBEP20(lptoken).transferFrom(msg.sender, bondVault, amount);
       address asset = iPOOL(lptoken).TOKEN();
        if(asset == WBNB){
           asset = address(0);
        }
        BondVault(bondVault).depINIT(asset, member, amount);
       return true;
    }

    function handleTransferIn(address _token, uint _amount) internal returns (uint LPunits){
        uint256 spartaAllocation = iUTILS(_DAO().UTILS()).calcSwapValueInBase(_token, _amount); 
        if(_token == address(0)){
                require((_amount == msg.value), "InputErr");
                LPunits = iROUTER(_DAO().ROUTER()).addLiquidityForMember{value:_amount}(spartaAllocation, _amount, _token, bondVault);
            } else {
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount);
                if(iBEP20(_token).allowance(address(this), iDAO(_DAO()).ROUTER()) < _amount){
                    uint256 approvalTNK = iBEP20(_token).totalSupply();  
                    iBEP20(_token).approve(_DAO().ROUTER(), approvalTNK);  
                }
                LPunits = iROUTER(_DAO().ROUTER()).addLiquidityForMember(spartaAllocation, _amount, _token, bondVault);
            } 
    }
    function claimAllForMember(address member) external returns (bool){
        address [] memory listedAssets = listedBondAssets;
        for(uint i =0; i<listedAssets.length; i++){
            uint claimA = calcClaimBondedLP(member,listedAssets[i]);
            if(claimA>0){
               BondVault(bondVault).cFMember(listedAssets[i],member);
            }
        }
        return true;
    }
    function claimForMember(address asset) external returns (bool){
        uint claimA = calcClaimBondedLP(msg.sender,asset);
            if(claimA>0){
               BondVault(bondVault).cFMember(asset,msg.sender);
            }
        return true;
    }
    
    function calcClaimBondedLP(address bondedMember, address asset) public returns (uint){
        uint claimAmount = BondVault(bondVault).cBLP(bondedMember, asset);
        return claimAmount;
    }

    //============================== HELPERS ================================//
    function assetListedCount() external view returns (uint256 count){
        return listedBondAssets.length;
    }
    function allListedAssets() external view returns (address[] memory _allListedAssets){
        return listedBondAssets;
    }
      function destroyMe() public onlyDAO {
         selfdestruct(payable(msg.sender));
    }
    
}