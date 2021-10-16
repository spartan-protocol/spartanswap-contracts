// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBASE.sol";
import "./iBEP20.sol";
import "./iDAO.sol";
import "./iPOOL.sol";
import "./iPOOLFACTORY.sol";
import "./iRESERVE.sol";
import "./iROUTER.sol";
import "./iUTILS.sol";
import "./TransferHelper.sol";

contract LendVault {
    address public immutable BASE;  // Sparta address
    address public DEPLOYER;        // Address that deployed this contract | can be purged to address(0)
    address public Lend;

    mapping(address => uint256) public mapTotalPool_balance; // LP's locked in the LendVault
    mapping(address => mapping(address => uint256)) private mapMemberPool_balance; // Member's LPs locked in LendVault
    mapping(address => mapping(address => uint256)) private mapMember_depositTime; // Timestamp when user last deposited


    constructor (address _base) {
        BASE = _base;
        DEPLOYER = msg.sender;
    }

    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER);
        _;
    }
     modifier onlyLend() {
        require(msg.sender == Lend);
        _;
    }

    function initialize(address _lend) external onlyDAO {
        Lend = _lend;
    }

    // Can purge deployer once DAO is stable and final
    function purgeDeployer() external onlyDAO {
        DEPLOYER = address(0);
    }

    // Get the current DAO address as reported by the BASE contract
    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    // Deposit lps into the lendVault
    function lendLP(address _pool, uint amount) external  {
        //drop lps into lend asset Mappings
        //Update global mappings
        //record timestamp
    }

    // Remove Lps from the vault
    function removeLP(address _pool) external  {
        //Sub lps from lend asset Mappings
        //Update global mappings
        //Record timestamp
    }
     
    //Lend  > lendVault
    function borrowFunds(address _poolDebt,  uint256 amount) external onlyLend {
        //Sub mappings for that pooled asset
        //Perform asym withdraw to sparta from pooled lps return to lend
        //Send Sparta to the lend.sol
    }
     
     //Lend > lendVault
    function returnFunds(address _poolDebt, uint256 amount) external onlyLend {
        //Recieve sparta
        //Perform asym add from sparta back into _poolDebt 
        //add lps back into mappings for the pooled asset
    }

    
}

