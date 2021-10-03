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

contract BondVault {
    address public immutable BASE;  // Sparta address
    address public DEPLOYER;        // Address that deployed this contract | can be purged to address(0)
    bool private bondRelease;       // If true; release all pending locked bond tokens (in the event of migration etc)
    address [] public arrayMembers; // History array of all past and present bond members

    address[] public listedBondPools; // Current list of bond enabled assets
    uint256 public bondingPeriodSeconds; // Vesting period for bonders (6 months) 

    struct ListedAssets {
        bool isListed;
        address[] members;
        mapping(address => bool) isAssetMember;
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
    mapping(address => bool) public isListed;   // Current list of bond enabled assets
    mapping(address => ListedAssets) public mapBondedAmount_memberDetails;
    mapping(address => bool) public isBondMember;
    mapping(address => uint256) public mapTotalPool_balance; // LP's locked in DAOVault
    event ListedAsset(address indexed DAO, address indexed asset);
    event DelistedAsset(address indexed DAO, address indexed asset);
    event Claimed(address indexed owner, address indexed poolAddress, uint amount);

    constructor (address _base) {
        BASE = _base;
        DEPLOYER = msg.sender;
        bondRelease = false;
        bondingPeriodSeconds = 15552000; // mainNet 6months 
    }

    // Restrict access
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER);
        _;
    }

    // Can purge deployer once DAO is stable and final
    function purgeDeployer() external onlyDAO {
        DEPLOYER = address(0);
    }

    // Get the current DAO address as reported by the BASE contract
    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    // Deposit amount in the BondVault for a user (Called from DAO)
    function depositForMember(address _pool, address member, uint amount) external onlyDAO {
        if(!mapBondedAmount_memberDetails[_pool].isAssetMember[member]){
            mapBondedAmount_memberDetails[_pool].isAssetMember[member] = true;  // Register user as member (scope: user -> asset)
            mapBondedAmount_memberDetails[_pool].members.push(member);          // Add user to member array (scope: user -> asset)
        }
        if(!isBondMember[member]){
            isBondMember[member] = true;    // Register user as member (scope: vault)
            arrayMembers.push(member);      // Add user to member array (scope: vault)
        }
        if(mapBondedAmount_memberDetails[_pool].bondedLP[member] != 0){
            claimForMember(_pool, member); // Force claim if member has an existing remainder
        }
        mapBondedAmount_memberDetails[_pool].bondedLP[member] += amount; // Add new deposit to users remainder
        mapBondedAmount_memberDetails[_pool].lastBlockTime[member] = block.timestamp; // Set lastBlockTime to current time
        mapBondedAmount_memberDetails[_pool].claimRate[member] = mapBondedAmount_memberDetails[_pool].bondedLP[member] / bondingPeriodSeconds; // Set claim rate per second
        mapTotalPool_balance[_pool] += amount; // Add new deposit to vault's total remainder
    }

    // Perform a claim of the users's current available claim amount (Called from DAO)
    function claimForMember(address _pool, address member) public onlyDAO {
        require(_pool != address(0), "!POOL"); // Must be a valid pool
        require(mapBondedAmount_memberDetails[_pool].bondedLP[member] > 0, '!bonded'); // They must have remaining unclaimed LPs
        require(mapBondedAmount_memberDetails[_pool].isAssetMember[member], '!member'); // They must be a member (scope: user -> asset)
        uint256 _claimable = calcBondedLP(member, _pool); // Get the current claimable amount
        mapBondedAmount_memberDetails[_pool].lastBlockTime[member] = block.timestamp; // Set lastBlockTime to current time
        mapBondedAmount_memberDetails[_pool].bondedLP[member] -= _claimable; // Remove the claim amount from the user's remainder
        if (mapBondedAmount_memberDetails[_pool].bondedLP[member] == 0){ // Equality enforced in calcBondedLP()
            mapBondedAmount_memberDetails[_pool].claimRate[member] = 0; // If final claim; zero-out their claimRate
        }
        mapTotalPool_balance[_pool] -= _claimable; // Remove the claim amount from vault's total remainder
        TransferHelper.safeTransfer(_pool, member, _claimable);
        emit Claimed(member, _pool, _claimable);
    }

     // Calculate the user's current available claim amount
    function calcBondedLP(address member, address _pool) public view returns (uint claimAmount){ 
        if(mapBondedAmount_memberDetails[_pool].isAssetMember[member]){
            uint256 _secondsSinceClaim = block.timestamp - mapBondedAmount_memberDetails[_pool].lastBlockTime[member]; // Get seconds passed since last claim
            uint256 rate = mapBondedAmount_memberDetails[_pool].claimRate[member]; // Get user's claim rate
            claimAmount = _secondsSinceClaim * rate; // Set claim amount
            if(claimAmount >= mapBondedAmount_memberDetails[_pool].bondedLP[member] || bondRelease){
                claimAmount = mapBondedAmount_memberDetails[_pool].bondedLP[member]; // If final claim; set claimAmount as remainder
            }
            return claimAmount;
        }
    }


    // Update a member's weight in the DAOVault (scope: pool)
    function getMemberLPWeight(address member) external onlyDAO returns (uint256 memberWeight, uint256 totalWeight) {
        require(iRESERVE(_DAO().RESERVE()).globalFreeze() != true, '!SAFE');
        address [] memory _vaultPools = iPOOLFACTORY(_DAO().POOLFACTORY()).getVaultAssets();
        for(uint i = 0; i < _vaultPools.length; i++){
                 memberWeight += iUTILS(_DAO().UTILS()).getPoolShareWeight(_vaultPools[i], mapBondedAmount_memberDetails[_vaultPools[i]].bondedLP[member]); // Get user's cumulative weight
                 totalWeight += iUTILS(_DAO().UTILS()).getPoolShareWeight(_vaultPools[i], mapTotalPool_balance[_vaultPools[i]]); // Get vault's cumulative total weight
           }
        return (memberWeight, totalWeight);
    }

    // Get the total count of all existing & past BondVault members
    function memberCount() external view returns (uint256 count){
        return arrayMembers.length;
    }

    // Get array of all existing & past BondVault members
    function allMembers() external view returns (address[] memory _allMembers){
        return arrayMembers;
    }

    // Release all locked bonded assets to members (in the event of migration or similar)
    function release() external onlyDAO {
        bondRelease = true;
    }

    // Get a bond details (scope: user -> asset)
    function getMemberDetails(address member, address _pool) external view returns (MemberDetails memory memberDetails){
        memberDetails.isMember = mapBondedAmount_memberDetails[_pool].isAssetMember[member];
        memberDetails.bondedLP = mapBondedAmount_memberDetails[_pool].bondedLP[member];
        memberDetails.claimRate = mapBondedAmount_memberDetails[_pool].claimRate[member];
        memberDetails.lastBlockTime = mapBondedAmount_memberDetails[_pool].lastBlockTime[member];
        return memberDetails;
    }

    // Get user's current balance of a chosen asset
    function getMemberPoolBalance(address _pool, address member) external view returns (uint256){
        return mapBondedAmount_memberDetails[_pool].bondedLP[member];
    }
        //================================ BOND Feature ==================================//

   

    // List an asset to be enabled for Bonding
    function listBondAsset(address asset) external onlyDAO {
        uint256 currentProposal = iDAO(_DAO().DAO()).currentProposal();
        require(iDAO(_DAO().DAO()).mapPID_open(currentProposal) == false, "OPEN"); // Must not be an open proposal (de-sync proposal votes)
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset); // Get the relevant pool address
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_pool));
        require(!isListed[_pool], 'listed'); // Asset must not be listed for Bond
        isListed[_pool] = true; // Register as a bond-enabled asset
        listedBondPools.push(_pool); // Add to record of current Bond assets
        emit ListedAsset(msg.sender, asset);
    }

    // Delist an asset from the Bond program
    function delistBondAsset(address asset) external onlyDAO {
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset); // Get the relevant pool address
        if(isListed[_pool]){
         isListed[_pool] = false; // Unregister as a currently enabled asset
         for (uint i = 0; i < listedBondPools.length; i++) {
            if (listedBondPools[i] == _pool) {
                listedBondPools[i] = listedBondPools[listedBondPools.length - 1]; // Move the last element into the place to delete
                listedBondPools.pop(); // Remove the last element
            }
         }
        emit DelistedAsset(msg.sender, asset);
        }
       
    }

 // User claims unlocked bonded units of a selected asset (keep internal; otherwise add weightChange modifier)
    function claim(address asset, address member) external onlyDAO {
        require(msg.sender != DEPLOYER);
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset); // Get the pool address
        uint claimAmount = calcBondedLP(member, _pool); // Check user's unlocked bonded LPs
        if(claimAmount > 0){
            claimForMember(_pool, member); // Claim LPs if any unlocked
        }
    }

    function getBondedAssets() external view returns (address [] memory bondedPools){
        return listedBondPools;
    }
    
}

