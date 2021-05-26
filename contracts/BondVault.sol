// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBEP20.sol";
import "./iDAO.sol";
import "./iBASE.sol";
import "./iUTILS.sol";
import "./iROUTER.sol";
import "./iPOOL.sol";
import "./iPOOLFACTORY.sol";
import "hardhat/console.sol";
contract BondVault {
    address public BASE;
    address public WBNB;
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
     constructor (address _base,address _wbnb) {
        BASE = _base;
        WBNB = _wbnb;
        DEPLOYER = msg.sender;
    }

    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER );
        _;
    }
    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }

    function _DAO() internal view returns(iDAO) {
         return iBASE(BASE).DAO(); 
    }

    function depositForMember(address asset, address member, uint LPS) external onlyDAO returns(bool){
         if(!mapBondAsset_memberDetails[asset].isMember[member]){
          mapBondAsset_memberDetails[asset].isMember[member] = true;
          arrayMembers.push(member);
          mapBondAsset_memberDetails[asset].members.push(member);
        }
        if(mapBondAsset_memberDetails[asset].bondedLP[member] != 0){
            claimForMember(asset, member);
        }
        mapBondAsset_memberDetails[asset].bondedLP[member] += LPS;
        mapBondAsset_memberDetails[asset].lastBlockTime[member] = block.timestamp;
        mapBondAsset_memberDetails[asset].claimRate[member] = mapBondAsset_memberDetails[asset].bondedLP[member] / iDAO(_DAO().DAO()).bondingPeriodSeconds();
        increaseWeight(asset, member);
        return true;
    }

    function increaseWeight(address asset, address member) internal{
        address pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset);
        if (mapMemberPool_weight[member][pool] > 0) {
            totalWeight -= mapMemberPool_weight[member][pool];
            mapMember_weight[member] -= mapMemberPool_weight[member][pool];
            mapMemberPool_weight[member][pool] = 0;
        }
        uint256 weight = iUTILS(_DAO().UTILS()).getPoolShareWeight(asset,mapBondAsset_memberDetails[asset].bondedLP[member]); 
        mapMemberPool_weight[member][pool] = weight;
        mapMember_weight[member] += weight;
        totalWeight += weight;
    }
    

     function calcBondedLP(address member, address asset) public onlyDAO returns (uint claimAmount){
        if(mapBondAsset_memberDetails[asset].isMember[member]){
         uint256 _secondsSinceClaim = block.timestamp - mapBondAsset_memberDetails[asset].lastBlockTime[member]; // Get time since last claim
         uint256 rate = mapBondAsset_memberDetails[asset].claimRate[member];
        if(_secondsSinceClaim >= iDAO(_DAO().DAO()).bondingPeriodSeconds()){
            mapBondAsset_memberDetails[asset].claimRate[member] = 0;
            claimAmount = mapBondAsset_memberDetails[asset].bondedLP[member];
        }else {
            claimAmount = _secondsSinceClaim * rate;
        }
        return claimAmount;
        }
    }
    function claimForMember(address asset, address member) public onlyDAO returns (bool){
        require(mapBondAsset_memberDetails[asset].bondedLP[member] > 0, '!bondedlps');
        require(mapBondAsset_memberDetails[asset].isMember[member], '!deposited');
        uint256 _claimable = calcBondedLP(member, asset); 
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset);
        require(_claimable <= mapBondAsset_memberDetails[asset].bondedLP[member],'attempted to overclaim');
        mapBondAsset_memberDetails[asset].lastBlockTime[member] = block.timestamp;
        mapBondAsset_memberDetails[asset].bondedLP[member] -= _claimable;
        decreaseWeight(asset, member);
        iBEP20(_pool).transfer(member, _claimable); // send LPs to user
        return true;
    }
    function decreaseWeight(address asset, address member) internal {
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset);
        totalWeight -= mapMemberPool_weight[member][_pool];
        mapMember_weight[member] -= mapMemberPool_weight[member][_pool];
        mapMemberPool_weight[member][_pool] = 0;
        uint256 weight = iUTILS(_DAO().UTILS()).getPoolShareWeight(iPOOL(_pool).TOKEN(),mapBondAsset_memberDetails[asset].bondedLP[member]); 
        mapMemberPool_weight[member][_pool] = weight;
        mapMember_weight[member] += weight;
        totalWeight += weight;
    }

     function memberCount() external view returns (uint256 count){
        return arrayMembers.length;
    }
    function allMembers() external view returns (address[] memory _allMembers){
        return arrayMembers;
    }
    function getMemberDetails(address member, address asset) external view returns (MemberDetails memory memberDetails){
        memberDetails.isMember = mapBondAsset_memberDetails[asset].isMember[member];
        memberDetails.bondedLP = mapBondAsset_memberDetails[asset].bondedLP[member];
        memberDetails.claimRate = mapBondAsset_memberDetails[asset].claimRate[member];
        memberDetails.lastBlockTime = mapBondAsset_memberDetails[asset].lastBlockTime[member];
        return memberDetails;
    }

    function getMemberWeight(address member) external view returns (uint256) {
        if (mapMember_weight[member] > 0) {
            return mapMember_weight[member];
        } else {
            return 0;
        }
    }
     
}