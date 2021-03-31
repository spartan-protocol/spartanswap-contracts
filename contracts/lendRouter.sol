// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import "./cInterfaces.sol";
import "@nomiclabs/buidler/console.sol";
interface iBASE {
    function DAO() external view returns (iDAO);
    function transferTo(address, uint256 ) external payable returns(bool);
}
interface iROUTER {
    function swap(uint, address, address) external returns(uint);
    function removeLiquidityExact(uint, address) external returns(uint, uint);
    function removeLiquidityAsym(uint units, bool toBase, address token) external returns(uint outputAmount, uint fee);
    function swapSynthToBase(uint inputAmount, address synthIN) external returns (uint outPut);
}
interface iUTILS {
   function calcSwapValueInBaseWithPool(address pool, uint amount) external view returns (uint value);
    function calcAsymmetricValueToken(address pool, uint amount) external pure returns (uint units);
    function calcAsymmetricValueBase(address pool, uint units) external view returns(uint amount);
    function calcShare(uint units,uint total, uint amount ) external view returns (uint unitShare);
    function calcSwapValueInBaseWithSYNTH(address token, uint units) external view returns (uint amount);
    function calcSpotValueInBase(address token, uint units) external view returns (uint amount);
    function allCuratedPools() external view returns (address [] memory);
    function calcLiquidityUnitsAsym(uint amount, address pool) external view returns (uint);
   
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
}
interface iSYNTH {
    function transferTo(address, uint256 ) external payable returns(bool);
}

interface iPOOLFACTORY {
    function isCuratedPool(address) external view returns (bool);
    function getPool(address) external view returns(address payable);
}
interface iSYNTHFACTORY {
    function isSynth(address) external view returns(bool);
}

contract LendRouter {
    using SafeMath for uint256;
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
    function depositForMember(address _assetD) public onlyLEND returns(uint256 _debtIssued){
        address _assetDPool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(_assetD); 
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_assetDPool) == true, "!Curated"); // only curated pools 
        uint inputBASE = iBEP20(BASE).balanceOf(address(this));
        iBEP20(BASE).approve(address(_DAO().ROUTER()), inputBASE);
         _debtIssued = iROUTER(_DAO().ROUTER()).swap(inputBASE, BASE, _assetD);
        iBEP20(_assetD).transfer(msg.sender,_debtIssued);
        return _debtIssued;
    }

    // Remove Collateral for a member
    function removeForMember(address _assetD) public onlyLEND returns (uint256 DebtReturned) {
        uint inputDebt = iBEP20(_assetD).balanceOf(address(this));
        iBEP20(_assetD).approve(address(_DAO().ROUTER()), inputDebt);
        uint outputBase = iROUTER(_DAO().ROUTER()).swap(inputDebt, _assetD, BASE);
         iBEP20(BASE).transfer(msg.sender,outputBase);
        return  outputBase;
    }

    function _handleTransferIn(address _token, uint256 _amount) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_token).balanceOf(address(this)); 
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount); 
                actual = iBEP20(_token).balanceOf(address(this)).sub(startBal);
        }
    }

    function destroyMe() public onlyLEND {
        selfdestruct(msg.sender);
    } 

    function getMemberLength() public view returns (uint memberCount){
        memberCount = membersActive.length;
        return memberCount;
    }

}