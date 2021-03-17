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
     function POOLFACTORY() external view returns(address);
     function BOND() external view returns (address);
     function depositForMember(address pool, uint256 amount, address member) external;
}
interface iROUTER {
    function getPool(address) external view returns(address payable);
    function addLiquidityForMember(uint, uint, address,address) external payable returns (uint);
    function addLiquidity(uint, uint, address) external payable returns (uint);
}

interface iPOOL {
    function transferTo(address, uint) external returns (bool);
    function removeLiquidity() external returns (uint outputBase, uint outputToken);
}

interface iPOOLFACTORY {
    function getPool(address token) external returns (address);
    function isPool(address) external view returns (bool);
}
interface iBOND {
    function depositInit(address, uint, address) external;
}



contract SPARTANUPGRADE {

   address public BASE;
   address public OLDRouter;

   address public DEPLOYER;

  constructor (address _base, address oldRouter) public payable {
        BASE = _base;
        OLDRouter = oldRouter;
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
        address newPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token); //get new pool
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isPool(newPool) == true, "!POOL");
        iPOOL(_oldPool).transferTo(_oldPool, amount);//RPTAF
        (uint outputBase, uint outputToken) = iPOOL(_oldPool).removeLiquidity();
        iBEP20(BASE).approve(address(_DAO().ROUTER()), outputBase);
        iBEP20(token).approve(address(_DAO().ROUTER()), outputToken);
        units = iROUTER(_DAO().ROUTER()).addLiquidityForMember(outputBase, outputToken, token, _member);    
        return units; 
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

  function destroyMe() public onlyDEPLOYER {
         selfdestruct(msg.sender);
    }
}