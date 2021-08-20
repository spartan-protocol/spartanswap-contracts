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

contract DaoVault {
    address public immutable BASE;
    address public DEPLOYER;

    constructor(address _base) {
        require(_base != address(0), '!ZERO');
        BASE = _base;
        DEPLOYER = msg.sender;
    }

    // mapping(address => uint256) public mapMember_weight; // Member's total weight in DAOVault
    mapping(address => mapping(address => uint256)) public mapMemberPool_balance; // Member's LPs locked in DAOVault
    mapping(address => uint256) public mapTotalPool_balance; // LP's locked in DAOVault
    mapping(address => mapping(address => uint256)) public mapMember_depositTime; // Timestamp when user last deposited
    // mapping(address => mapping(address => uint256)) public mapMemberPool_weight; // Member's total weight in DOAVault (scope: pool)

    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "!DAO");
        _;
    }

    function _DAO() internal view returns (iDAO) {
        return iBASE(BASE).DAO();
    }

    // User deposits LP tokens in the DAOVault
    function depositLP(address pool, uint256 amount, address member) external onlyDAO returns (bool) {
        mapMemberPool_balance[member][pool] += amount; // Updated user's vault balance
        mapTotalPool_balance[pool] += amount;
        mapMember_depositTime[member][pool] = block.timestamp; // Set user's new last-deposit-time
        // increaseLPWeight(pool, member); // Recalculate user's DAOVault weights
        return true;
    }

    // Update a member's weight in the DAOVault (scope: pool)
    function getMemberLPWeight(address member) external onlyDAO returns (uint256 memberWeight, uint256 totalWeight) {
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '!SAFE');
        address [] memory vaultAssets = iPOOLFACTORY(_DAO().POOLFACTORY()).vaultAssets(); 
        for(uint i =0; i< vaultAssets.length; i++){
            memberWeight += iUTILS(_DAO().UTILS()).getPoolShareWeight(vaultAssets[i], mapMemberPool_balance[member][vaultAssets[i]]); // Get user's current weight
            totalWeight += iUTILS(_DAO().UTILS()).getPoolShareWeight(vaultAssets[i], mapTotalPool_balance[vaultAssets[i]]); // Get user's current weight
        }
        return (memberWeight, totalWeight);
    }

    // Withdraw 100% of user's LPs from their DAOVault
    function withdraw(address pool, address member) external onlyDAO returns (bool){
        require(block.timestamp > (mapMember_depositTime[member][pool] + 86400), '!unlocked'); // 1 day must have passed since last deposit (lockup period)
        uint256 _balance = mapMemberPool_balance[member][pool]; // Get user's whole balance (scope: member -> pool)
        require(_balance > 0, "!balance"); // Withdraw amount must be valid
        mapMemberPool_balance[member][pool] = 0; // Zero out user's balance (scope: member -> pool)
        require(iBEP20(pool).transfer(member, _balance), "!transfer"); // Transfer user's balance to their wallet
        return true;
    }

    // Get user's current balance of a chosen asset
    function getMemberPoolBalance(address pool, address member)  external view returns (uint256){
        return mapMemberPool_balance[member][pool];
    }
}