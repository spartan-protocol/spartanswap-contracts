pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./interfaces/iBEP20.sol";
import "./interfaces/iDAO.sol";
import "./interfaces/iBASE.sol";
import "./interfaces/iUTILS.sol";
import "./interfaces/iROUTER.sol";
import "./interfaces/iBOND.sol";
import "./interfaces/iPOOL.sol";
import "./interfaces/iPFACTORY.sol";

contract BondVault {
    address public BASE;
    address public DEPLOYER;

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
    mapping(address => ListedAssets) public mapAddress_listedAssets;

     constructor (address _base) public payable {
        BASE = _base;
        DEPLOYER = msg.sender;
    }

    modifier onlyDAO() {
        require(msg.sender == _DAO().BOND() || msg.sender == DEPLOYER );
        _;
    }
    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }

    function _DAO() internal view returns(iDAO) {
         return iBASE(BASE).DAO(); 
    }

    function depositForMember(address asset, address member, uint LPS) external onlyDAO returns(bool){
         if(!mapAddress_listedAssets[asset].isMember[member]){
          mapAddress_listedAssets[asset].isMember[member] = true;
          arrayMembers.push(member);
          mapAddress_listedAssets[asset].members.push(member);
        }
        if(mapAddress_listedAssets[asset].bondedLP[member] != 0){
            claimForMember(asset, member);
        }

        mapAddress_listedAssets[asset].bondedLP[member] += LPS;
        mapAddress_listedAssets[asset].lastBlockTime[member] = block.timestamp;
        mapAddress_listedAssets[asset].claimRate[member] = mapAddress_listedAssets[asset].bondedLP[member] / iBOND(_DAO().BOND()).bondingPeriodSeconds();
        return true;
    }

     function calcBondedLP(address member, address asset) public onlyDAO returns (uint claimAmount){
        if(mapAddress_listedAssets[asset].isMember[member]){
         uint256 _secondsSinceClaim = block.timestamp - mapAddress_listedAssets[asset].lastBlockTime[member]; // Get time since last claim
         uint256 rate = mapAddress_listedAssets[asset].claimRate[member];
        if(_secondsSinceClaim >= iBOND(_DAO().BOND()).bondingPeriodSeconds()){
            mapAddress_listedAssets[asset].claimRate[member] = 0;
            claimAmount = mapAddress_listedAssets[asset].bondedLP[member];
        }else {
            claimAmount = _secondsSinceClaim * rate;
        }
        return claimAmount;
        }
    }
    function claimForMember(address asset, address member) public onlyDAO returns (bool){
        require(mapAddress_listedAssets[asset].bondedLP[member] > 0, '!bondedlps');
        require(mapAddress_listedAssets[asset].isMember[member], '!deposited');
        uint256 _claimable = calcBondedLP(member, asset); 
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset);
        require(_claimable <= mapAddress_listedAssets[asset].bondedLP[member],'attempted to overclaim');
        mapAddress_listedAssets[asset].lastBlockTime[member] = block.timestamp;
        mapAddress_listedAssets[asset].bondedLP[member] -= _claimable;
        iBEP20(_pool).transfer(member, _claimable); // send LPs to user
        return true;
    }
     function memberCount() external view returns (uint256 count){
        return arrayMembers.length;
    }
    function allMembers() external view returns (address[] memory _allMembers){
        return arrayMembers;
    }
    function getMemberDetails(address member, address asset) external view returns (MemberDetails memory memberDetails){
        memberDetails.isMember = mapAddress_listedAssets[asset].isMember[member];
        memberDetails.bondedLP = mapAddress_listedAssets[asset].bondedLP[member];
        memberDetails.claimRate = mapAddress_listedAssets[asset].claimRate[member];
        memberDetails.lastBlockTime = mapAddress_listedAssets[asset].lastBlockTime[member];
        return memberDetails;
    }
     
}