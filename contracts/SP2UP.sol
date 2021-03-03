// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import "./cInterfaces.sol";
interface iBASE {
    function DAO() external view returns (iDAO);
    function burn(uint) external;
    function claim(address asset, uint256 amount) external payable;  
}
interface iDAO {
     function ROUTER() external view returns(address);
     function UTILS() external view returns(address);
     function DAO() external view returns (address);
     function depositForMember(address pool, uint256 amount, address member) external;
}
interface iROUTER {
    function getPool(address) external view returns(address payable);
    function addLiquidityForMember(uint, uint, address,address) external payable returns (uint);
}

interface iPOOL {
    function transferTo(address, uint) external returns (bool);
    function removeLiquidity() public returns (uint outputBase, uint outputToken) 
}

interface iPSFACTORY {
    function getPool(address token) external returns (address);
    function isPool(address) external view returns (bool);
}



contract SPARTANUPGRADE {

   address public BASE;
   address public OLDRouter;
   address public OLDUtils;
   address public DEPLOYER;

  constructor (address _base, address oldRouter, address oldUtils) public payable {
        BASE = _base;
        OLDRouter = oldRouter;
        OLDUtils = oldUtils;
        DEPLOYER = msg.sender;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }
      modifier onlyDEPLOYER() {
        require(msg.sender == DEPLOYER );
        _;
    }

    function migrateLiquidity(address token, uint amount) public returns (uint units) {
        address _member = msg.sender;
        address _oldPool = iROUTER(OLDRouter).getPool(token);//get old pool
        address newPool = iPSFACTORY(_DAO().PSFACTORY()).getPool(token); //get new pool
        require(iPSFACTORY(_DAO().PSFACTORY()).isPool(newPool) == true, "!POOL");
        iPOOL(_oldPool).transferTo(_oldPool, amount);//RPTAF
        (uint outputBase, uint outputToken) = iPOOL(_oldPool).removeLiquidity();
        iBEP20(BASE).approve(address(_DAO().ROUTER()), outputBase);
        iBEP20(token).approve(address(_DAO().ROUTER()), outputToken);
        units = iROUTER(_DAO().ROUTER()).addLiquidityForMember(outputBase, outputToken, token, _member);    
        return units; 
    }
    //function upgrade Bondv2
    // step : Take LPs from user 

  function destroyMe() public onlyDEPLOYER {
         selfdestruct(msg.sender);
    }
}