// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./interfaces/iBEP20.sol";
import "./BondVault.sol";

    //======================================SPARTA=========================================//
contract Bond {

  // Parameters
    address public BASE;
    address public bondVault;
    address public WBNB;
  
    address public DEPLOYER;
    uint public one = 10**18;
    address [] listedBondAssets;
    uint256 public bondingPeriodSeconds = 15552000;//6 months

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
    constructor(address _base, address _wbnb, address _bondVault) public {
        BASE = _base;
        WBNB = _wbnb;
        bondVault = _bondVault;
        DEPLOYER = msg.sender;
    }
    function _DAO() internal view returns(iDAO) {
         return iBASE(BASE).DAO();
    }
    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }
     function setAddress(address _bondVault) public onlyDAO {
        bondVault = _bondVault;
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
    function moveBondBASEBalance(address newBond) external onlyDAO returns(bool){
         uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
         iBEP20(BASE).transfer(newBond, baseBal);
         return true;
    }
     //================================ BOND Feature ==================================//
    function deposit(address asset, uint256 amount) external payable returns (bool success) {
        require(amount > 0, '!asset');
        require(isListed[asset], '!listed');
        uint256 liquidityUnits = handleTransferIn(asset, amount);
        BondVault(bondVault).depForMember(asset, msg.sender, liquidityUnits);
        emit DepositAsset(msg.sender, amount, liquidityUnits);
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
    
}