// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBEP20.sol";
import "./iDAO.sol";
import "./iBASE.sol";
import "./iUTILS.sol";
import "./iROUTER.sol";
import "./iPOOL.sol";
import "./iPOOLFACTORY.sol";

contract BondVault {
    address public BASE;
    address public DEPLOYER;
    uint256 public totalWeight;

    address [] public arrayMembers;

    struct ListedAssets {
        bool isListed;
        address[] members;
        mapping(address => bool) isMember;
        mapping(address => uint256) bondedLP;
        mapping(address => uint256) claimRate;
        mapping(address => uint256) lastBlockTime;
    }
    struct MemberDetails {
        bool isMember;
        uint256 bondedLP;
        uint256 claimRate;
        uint256 lastBlockTime;
    }

    mapping(address => ListedAssets) public mapBondAsset_memberDetails;
    mapping(address => uint256) private mapMember_weight; // Value of weight
    mapping(address => mapping(address => uint256)) private mapMemberPool_weight; // Value of weight for pool

    constructor (address _base) {
        BASE = _base;
        DEPLOYER = msg.sender;
    }

    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER);
        _;
    }

    // Can purge deployer once DAO is stable and final
    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }

    // Get the current DAO address as reported by the BASE contract
    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    // Deposit LPs in the BondVault for a bonder (Called from DAO)
    function depositForMember(address asset, address member, uint LPS) external onlyDAO returns(bool){
        if(!mapBondAsset_memberDetails[asset].isMember[member]){
            // Add bonder as member
            mapBondAsset_memberDetails[asset].isMember[member] = true;
            arrayMembers.push(member);
            mapBondAsset_memberDetails[asset].members.push(member);
        }
        if(mapBondAsset_memberDetails[asset].bondedLP[member] != 0){
            claimForMember(asset, member); // Force claim if member has existing claimable LPs
        }
        mapBondAsset_memberDetails[asset].bondedLP[member] += LPS;
        mapBondAsset_memberDetails[asset].lastBlockTime[member] = block.timestamp;
        mapBondAsset_memberDetails[asset].claimRate[member] = mapBondAsset_memberDetails[asset].bondedLP[member] / iDAO(_DAO().DAO()).bondingPeriodSeconds();
        increaseWeight(asset, member);
        return true;
    }

    // Increase bonders weight in the BondVault
    function increaseWeight(address asset, address member) internal{
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset); // Get pool address
        if (mapMemberPool_weight[member][pool] > 0) {
            totalWeight -= mapMemberPool_weight[member][pool]; // Remove members weight from the BondVault totalWeight
            mapMember_weight[member] -= mapMemberPool_weight[member][pool]; // Remove member's weight from their totalWeight
            mapMemberPool_weight[member][pool] = 0; // Zero out member's weight (asset-scope)
        }
        uint256 weight = iUTILS(_DAO().UTILS()).getPoolShareWeight(asset, mapBondAsset_memberDetails[asset].bondedLP[member]);
        mapMemberPool_weight[member][pool] = weight; // Set member's new weight (asset-scope)
        mapMember_weight[member] += weight; // Add new weight to members totalWeight
        totalWeight += weight; // Add new weight to BondVault totalWeight
    }

    // Calculate the bonder's current available claim amount
    function calcBondedLP(address member, address asset) public onlyDAO returns (uint claimAmount){
        if(mapBondAsset_memberDetails[asset].isMember[member]){
            uint256 _secondsSinceClaim = block.timestamp - mapBondAsset_memberDetails[asset].lastBlockTime[member]; // Get seconds passed since last claim
            uint256 rate = mapBondAsset_memberDetails[asset].claimRate[member]; // Get member claimRate (asset-scope)
            if(_secondsSinceClaim >= iDAO(_DAO().DAO()).bondingPeriodSeconds()){ // Check if member is able to claim remainder
                mapBondAsset_memberDetails[asset].claimRate[member] = 0; // Zero-out their claim rate
                claimAmount = mapBondAsset_memberDetails[asset].bondedLP[member]; // Set remainder as the claim amount
            } else {
                claimAmount = _secondsSinceClaim * rate; // Set claim amount
            }
            return claimAmount;
        }
    }

    // Perform a claim of the bonder's current available claim amount
    function claimForMember(address asset, address member) public onlyDAO returns (bool){
        require(mapBondAsset_memberDetails[asset].bondedLP[member] > 0, '!bonded'); // They must have remaining unclaimed LPs
        require(mapBondAsset_memberDetails[asset].isMember[member], '!member'); // They must be a member (asset-scope)
        uint256 _claimable = calcBondedLP(member, asset); // Get the current claimable amount
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset); // Get the pool address
        require(_claimable <= mapBondAsset_memberDetails[asset].bondedLP[member], 'overclaim'); // Prevent a claim greater than the remainder
        mapBondAsset_memberDetails[asset].lastBlockTime[member] = block.timestamp; // Set last claim to current time
        mapBondAsset_memberDetails[asset].bondedLP[member] -= _claimable; // Remove the claim amount from the user's remainder
        decreaseWeight(asset, member); // Recalculate user's weight
        iBEP20(_pool).transfer(member, _claimable); // send LPs to user
        return true;
    }

    // Decrease bonders weight in the BondVault
    function decreaseWeight(address asset, address member) internal {
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset); // Get pool address
        totalWeight -= mapMemberPool_weight[member][_pool]; // Remove bonder's existing weight from the BondVault totalWeight
        mapMember_weight[member] -= mapMemberPool_weight[member][_pool]; // Remove bonder's existing weight from their totalWeight
        mapMemberPool_weight[member][_pool] = 0; // Zero-out bonder's weight (asset-scope)
        uint256 weight = iUTILS(_DAO().UTILS()).getPoolShareWeight(iPOOL(_pool).TOKEN(), mapBondAsset_memberDetails[asset].bondedLP[member]);
        mapMemberPool_weight[member][_pool] = weight; // Set bonder's new weight (asset-scope)
        mapMember_weight[member] += weight; // Add bonder's new weight to their totalWeight
        totalWeight += weight; // Add bonder's new weight to BondVault totalWeight
    }

    // Get the total count of all existing & past BondVault members
    function memberCount() external view returns (uint256 count){
        return arrayMembers.length;
    }

    // Get array of all existing & past BondVault members
    function allMembers() external view returns (address[] memory _allMembers){
        return arrayMembers;
    }

    // Get a bonder's member details (asset-scope)
    function getMemberDetails(address member, address asset) external view returns (MemberDetails memory memberDetails){
        memberDetails.isMember = mapBondAsset_memberDetails[asset].isMember[member];
        memberDetails.bondedLP = mapBondAsset_memberDetails[asset].bondedLP[member];
        memberDetails.claimRate = mapBondAsset_memberDetails[asset].claimRate[member];
        memberDetails.lastBlockTime = mapBondAsset_memberDetails[asset].lastBlockTime[member];
        return memberDetails;
    }

    // Get a bonder's totalWeight
    function getMemberWeight(address member) external view returns (uint256) {
        if (mapMember_weight[member] > 0) {
            return mapMember_weight[member];
        } else {
            return 0;
        }
    } 
}