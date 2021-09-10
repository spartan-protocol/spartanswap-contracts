// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBEP20.sol";
import "./iDAO.sol";
import "./iBASE.sol";
import "./iPOOL.sol";
import "./iUTILS.sol";
import "./iROUTER.sol";
import "./iRESERVE.sol";
import "./iPOOLFACTORY.sol";
import "./TransferHelper.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract DaoVault is ReentrancyGuard {
    address public immutable BASE;  // SPARTA base contract address
    address public DEPLOYER;        // Address that deployed contract

    constructor(address _base) {
        BASE = _base;
        DEPLOYER = msg.sender;
    }

    mapping(address => uint256) public mapTotalPool_balance; // LP's locked in DAOVault (Global)
    mapping(address => mapping(address => uint256)) private mapMemberPool_balance; // Member's LPs locked in DAOVault (Member)
    mapping(address => mapping(address => uint256)) private mapMember_depositTime; // Timestamp when user last deposited

    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "!DAO");
        _;
    }

    // Can purge deployer once DAO is stable and final
    function purgeDeployer() external onlyDAO {
        DEPLOYER = address(0);
    }

    // Get DAO address from the Sparta base contract
    function _DAO() internal view returns (iDAO) {
        return iBASE(BASE).DAO();
    }

    // User deposits LP tokens in the DAOVault
    function depositLP(address pool, uint256 amount, address member) external onlyDAO returns (bool) {
        mapMemberPool_balance[member][pool] += amount; // Updated user's vault balance
        mapTotalPool_balance[pool] += amount; // Update total vault balance (global)
        mapMember_depositTime[member][pool] = block.timestamp; // Set user's new last-deposit-time
        return true;
    }

    // Get a member's and the vault's total weight (Just DAOVault)
    function getMemberLPWeight(address member) external onlyDAO returns (uint256 memberWeight, uint256 totalWeight) {
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '!SAFE');
        address [] memory vaultAssets = iPOOLFACTORY(_DAO().POOLFACTORY()).getVaultAssets(); // Get list of vault-enabled assets
        for(uint i =0; i< vaultAssets.length; i++){
            memberWeight += iUTILS(_DAO().UTILS()).getPoolShareWeight(vaultAssets[i], mapMemberPool_balance[member][vaultAssets[i]]); // Get member's current total DAOVault weight
            totalWeight += iUTILS(_DAO().UTILS()).getPoolShareWeight(vaultAssets[i], mapTotalPool_balance[vaultAssets[i]]); // Get DaoVault's current total weight
        }
        return (memberWeight, totalWeight);
    }

    // Withdraw 100% of user's LPs from the DAOVault (1 asset type)
    function withdraw(address pool, address member) external onlyDAO nonReentrant returns (bool){
        require(block.timestamp > (mapMember_depositTime[member][pool] + 86400), '!unlocked'); // 1 day must have passed since last deposit (lockup period)
        uint256 _balance = mapMemberPool_balance[member][pool]; // Get user's whole DAOVault balance of the selected asset
        require(_balance > 0, "!balance"); // Withdraw amount must be valid
        mapTotalPool_balance[pool] -=_balance;//remove from total
        mapMemberPool_balance[member][pool] = 0; // Zero out user's DAOVault balance of the selected asset
        TransferHelper.safeTransfer(pool,member, _balance);
        return true;
    }

    // Get user's current balance of a chosen asset
    function getMemberPoolBalance(address pool, address member) external view returns (uint256){
        return mapMemberPool_balance[member][pool];
    }

    // Get user's last deposit time of a chosen asset
    function getMemberPoolDepositTime(address pool, address member) external view returns (uint256){
        return mapMember_depositTime[member][pool];
    }
}