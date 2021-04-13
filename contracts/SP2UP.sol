// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import "./cInterfaces.sol";

interface iBASE {
    function DAO() external view returns (iDAO);
    function burn(uint) external;
    function claim(address asset, uint256 amount) external payable;  
}
interface iNDAO {
    function DAO() external view returns (iDAO);
}
interface iDAO {
     function ROUTER() external view returns(address);
     function UTILS() external view returns(address);
     function DAO() external view returns (address);
     function MSTATUS() external view returns(bool);
     function POOLFACTORY() external view returns(address);
     function BOND() external view returns (address);
     function depositForMember(address pool, uint256 amount, address member) external;
}
interface iROUTER {
    function getPool(address) external view returns(address payable);
    function addLiquidityForMember(uint, uint, address,address) external payable returns (uint);
    function addLiquidity(uint, uint, address) external payable returns (uint);
    function tokenCount() external view returns(uint256);
    function getToken(uint256 i) external view returns(address);
}
interface iPOOL {
    function transferTo(address, uint) external returns (bool);
    function removeLiquidity() external returns (uint outputBase, uint outputToken);
    function removeLiquidityForMember(address) external returns (uint outputBase, uint outputToken);
    function addLiquidityForMember(address) external payable returns (uint);
}
interface iPOOLFACTORY {
    function getPool(address token) external returns (address);
    function isPool(address) external view returns (bool);
}
interface iBOND {
    function depositInit(address, uint, address) external;
     function claimAndLockForMember(address asset, address member) external returns (bool);
     function allListedAssets() external returns(address [] memory allListAssets);
     function assetListedCount() external returns (uint);
     function calcClaimBondedLP(address, address) external returns (uint);
}

contract SPARTANUPGRADE {

   address public BASE;
   address public OLDRouter;
   address public OLDBOND;
   address private NDAO;
   address public DEPLOYER;
   
  constructor (address _base, address oldRouter, address _oldBond, address _newDAO) public payable {
        BASE = _base;
        NDAO = _newDAO;
        OLDRouter = oldRouter;
         OLDBOND = _oldBond;
        DEPLOYER = msg.sender;
    }

    function _DAO() internal view returns(iDAO) {
        bool status = iDAO(NDAO).MSTATUS();
        if(status == true){
         return iBASE(BASE).DAO();
        }else{
          return iNDAO(NDAO).DAO();
        }
    }
      modifier onlyDEPLOYER() {
        require(msg.sender == DEPLOYER );
        _;
    }

    function migrateLiquidity() public returns (bool) {
        address _member = msg.sender; address _oldPool;  uint amount;
        uint tokenAll = iROUTER(OLDRouter).tokenCount();
        for(uint i = 0; i < tokenAll; i++){
          address token = iROUTER(OLDRouter).getToken(i);
          uint decimals = iBEP20(token).decimals();
           _oldPool = iROUTER(OLDRouter).getPool(token);//get old pool
            amount = iBEP20(_oldPool).balanceOf(_member);
          if(decimals != 18){ 
              if(amount > 0){
              iPOOL(_oldPool).transferTo(_oldPool, amount);//RPTAF
              iPOOL(_oldPool).removeLiquidityForMember(_member);
              }
            }else{
             if(amount > 0){
              address newPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token); //get new pool
              if(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(newPool) == true){
               iPOOL(_oldPool).transferTo(_oldPool, amount);//RPTAF
              (uint outputBase, uint outputToken) = iPOOL(_oldPool).removeLiquidity();
                iBEP20(BASE).transfer(newPool, outputBase);
                iBEP20(token).transfer(newPool, outputToken);
                iPOOL(newPool).addLiquidityForMember(_member);
              }
              }
            }
         }
         return true;
        }

    function upgradeBond(address token) public returns (bool){
        address _member = msg.sender;
         address _oldPool = iROUTER(OLDRouter).getPool(token);//get old pool
        address _newPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token); //get new pool
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(_newPool) == true, "!POOL");
        uint256 lpBalance =  iBEP20(_oldPool).balanceOf(_member); // get user LP balance incase of bondv2 claim
        iDAO(_DAO().DAO()).depositForMember(_oldPool, lpBalance, _member); //send lp tokens to DAO for lock
        return true;
    }

    function upgradeBONDv3()public returns (bool){
        address [] memory listedAssets = iBOND(OLDBOND).allListedAssets();
        uint listedCount = iBOND(OLDBOND).assetListedCount();
        for(uint i = 0; i< listedCount; i++){
              uint amount = iBOND(OLDBOND).calcClaimBondedLP(msg.sender, listedAssets[i]);
            if(amount > 0){
               iBOND(OLDBOND).claimAndLockForMember(listedAssets[i], msg.sender);
            }
            
        }
        return true;
    }

  function destroyMe() public onlyDEPLOYER {
         selfdestruct(msg.sender);
    }
}