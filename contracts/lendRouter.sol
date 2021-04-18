// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iBEP20.sol";
import "@nomiclabs/buidler/console.sol";
interface iBASE {
    function DAO() external view returns (iDAO);
    function transferTo(address, uint256 ) external payable returns(bool);
}
interface iROUTER {
    function swap(uint, address, address) external returns(uint);
    function removeLiquidityExact(uint, address) external returns(uint, uint);
    function removeLiquidityAsym(uint, bool, address ) external returns(uint, uint);
    function swapSynthToBase(uint, address) external returns (uint );
}
interface iUTILS {
   function calcSwapValueInBaseWithPool(address, uint) external view returns (uint );
    function calcAsymmetricValueToken(address, uint) external pure returns (uint );
    function calcAsymmetricValueBase(address, uint ) external view returns(uint );
    function calcShare(uint ,uint , uint  ) external view returns (uint );
    function calcSwapValueInBaseWithSYNTH(address , uint ) external view returns (uint );
    function calcSpotValueInBase(address , uint ) external view returns (uint );
    function allCuratedPools() external view returns (address [] memory);
    function calcSwapValueInToken(address, uint) external view returns(uint);
    function calcSwapValueInBase(address, uint) external view returns(uint);
    function calcLiquidityUnitsAsym(uint , address ) external view returns (uint); 
}
interface iDAO {
    function ROUTER() external view returns(address);
    function UTILS() external view returns(address);
    function DAO() external view returns (address);
    function LEND() external view returns (address);
    function POOLFACTORY() external view returns (address);
    function SYNTHFACTORY() external view returns (address);
   
}
interface iPOOL {
    function TOKEN() external view returns(address);
    function transferTo(address, uint256 ) external payable returns(bool);
    function sync() external; 
    function baseAmount() external view returns(uint);
    function tokenAmount() external view returns(uint);
    function removeLiquidity() external returns (uint, uint);
}
interface iSYNTH {
    function LayerONE() external view returns(address);
    function mintSynth(address, address) external returns (uint);
    function redeemSynth(uint) external returns(uint);
    function transferTo(address, uint256 ) external payable returns(bool);
}

interface iPOOLFACTORY {
    function isCuratedPool(address) external view returns (bool);
     function isPool(address) external view returns (bool);
    function getPool(address) external view returns(address payable);
}
interface iSYNTHFACTORY {
    function isSynth(address) external view returns(bool);
}

contract LendRouter {
    uint32 private membersActiveCount;
    address public BASE;
    address public DEPLOYER;
    address [] public membersActive;

    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    event Liquidated(address indexed asset, uint units, uint outputAmount);
    event InterestPayment(address indexed asset, uint units, uint outputAmount);

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }
     modifier onlyLEND() {
        require(msg.sender == DEPLOYER || msg.sender == _DAO().LEND());
        _;
    }

    constructor (address _base) public payable {
        BASE = _base;
        DEPLOYER = msg.sender;
    }
    
    // add collateral for member
    function depositForMember(address assetD) public onlyLEND returns(uint256 _debtIssued){
        address _assetDPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(assetD); 
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_assetDPool) == true, "!Curated"); // only curated pools 
        uint _inputBASE = iBEP20(BASE).balanceOf(address(this));
        iBEP20(BASE).approve(address(_DAO().ROUTER()), _inputBASE);
         _debtIssued = iROUTER(_DAO().ROUTER()).swap(_inputBASE, BASE, assetD);
        iBEP20(assetD).transfer(msg.sender,_debtIssued);
        return _debtIssued;
    }

    // Remove Collateral for a member
    function removeForMember(address assetD) public onlyLEND returns (uint256 DebtReturned) {
        uint inputDebt = iBEP20(assetD).balanceOf(address(this));
        iBEP20(assetD).approve(address(_DAO().ROUTER()), inputDebt);
        uint outputBase = iROUTER(_DAO().ROUTER()).swap(inputDebt, assetD, BASE);
         iBEP20(BASE).transfer(msg.sender,outputBase);
        return  outputBase;
    }

    function _handleTransferIn(address _token, uint256 _amount) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_token).balanceOf(address(this)); 
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount); 
                actual = iBEP20(_token).balanceOf(address(this))-(startBal);
        }
    }

    function destroyMe() public onlyLEND {
        selfdestruct(payable(msg.sender));
    } 

    function getMemberLength() public view returns (uint memberCount){
        return membersActive.length;
    }

}