// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iBEP20.sol";
import "./iBASE.sol";
import "./iDAO.sol";
import "./iPOOL.sol";
import "./iPOOLFACTORY.sol";
import "./iRESERVE.sol";
import "./iROUTER.sol";
import "./iUTILS.sol";
import "./TransferHelper.sol";


contract LendRouter {
    address public BASE;
    address public DEPLOYER;

    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }
     modifier onlyLEND() {
        require(msg.sender == DEPLOYER || msg.sender == _DAO().LEND());
        _;
    }

    constructor (address _base) {
        BASE = _base;
        DEPLOYER = msg.sender;
    }
    
    //Perform downstream debt swap
    function borrowDebt(address assetDebt) public onlyLEND returns(uint256 _debtIssued){
     
    }

    //Perform upstream collateral swap
    function removeForMember(address assetCol) public onlyLEND returns (uint256 DebtReturned) {

    }


}