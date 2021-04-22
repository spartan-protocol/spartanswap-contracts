pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;

import "./iBEP20.sol"; 
interface iBASE {
    function DAO() external view returns (iDAO);
    function burn(uint) external;
    function claim(address asset, uint256 amount) external payable;  
}
interface iDAO {
     function ROUTER() external view returns(address);
     function UTILS() external view returns(address);
     function DAO() external view returns (address);
     function BOND() external view returns (address);
     function MSTATUS() external view returns(bool);
     function POOLFACTORY() external view returns(address);
     function depositForMember(address pool, uint256 amount, address member) external;
}
interface iNDAO {
    function DAO() external view returns (iDAO);
 
}
interface iROUTER {
    function addLiquidityForMember(uint inputBase, uint inputToken, address token, address member) external payable returns (uint units);
}
interface iUTILS {
    function calcSwapValueInBase(address pool, uint256 amount) external view returns (uint256 value);
}
interface iBOND {
    function bondingPeriodSeconds() external view returns(uint);
}
interface iPOOL {
    function TOKEN() external view returns(address);
}
interface iPOOLFACTORY {
    function getPool(address token) external returns (address);
}

contract BondVault {
    address public BASE;
    address public NDAO;
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

     constructor (address _base, address _newDAO) public payable {
        BASE = _base;
        NDAO = _newDAO;
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
        bool _status = iDAO(NDAO).MSTATUS();
        if(_status == true){
         return iBASE(BASE).DAO();
        }else{
          return iNDAO(NDAO).DAO();
        }
    }
    function changeNDAO(address newDAO) public onlyDAO {
        NDAO = newDAO;
    }

    function migrateMemberDetails(address member, address asset, address oldBond) external onlyDAO returns (bool){
        MemberDetails memory memberDetails = BondVault(oldBond).getMemberDetails(member, asset);
        mapAddress_listedAssets[asset].isMember[member] = memberDetails.isMember;
        mapAddress_listedAssets[asset].bondedLP[member] = memberDetails.bondedLP;
        mapAddress_listedAssets[asset].claimRate[member] = memberDetails.claimRate;
        mapAddress_listedAssets[asset].lastBlockTime[member] = memberDetails.lastBlockTime;
        return true;
    }
    function migrateBondedAssets(address asset, address newBond) external onlyDAO returns (bool){
       uint256 assetBal = iBEP20(asset).balanceOf(address(this));
       iBEP20(asset).transfer(newBond, assetBal);
        return true;
    }

    function depForMember(address asset, address member, uint LPS) external onlyDAO returns(bool){
         if(!mapAddress_listedAssets[asset].isMember[member]){
          mapAddress_listedAssets[asset].isMember[member] = true;
          arrayMembers.push(member);
          mapAddress_listedAssets[asset].members.push(member);
        }
        if(mapAddress_listedAssets[asset].bondedLP[member] != 0){
            cFMember(asset, member);
        }

        mapAddress_listedAssets[asset].bondedLP[member] += LPS;
        mapAddress_listedAssets[asset].lastBlockTime[member] = block.timestamp;
        mapAddress_listedAssets[asset].claimRate[member] = mapAddress_listedAssets[asset].bondedLP[member] / iBOND(_DAO().BOND()).bondingPeriodSeconds();
        return true;
    }
    function depINIT(address asset, address member, uint LPS) external onlyDAO returns (bool){
         if(!mapAddress_listedAssets[asset].isMember[member]){
          mapAddress_listedAssets[asset].isMember[member] = true;
          arrayMembers.push(member);
          mapAddress_listedAssets[asset].members.push(member);
        }
        mapAddress_listedAssets[asset].bondedLP[member] += LPS;
        mapAddress_listedAssets[asset].lastBlockTime[member] = block.timestamp;
        mapAddress_listedAssets[asset].claimRate[member] = mapAddress_listedAssets[asset].bondedLP[member] / 20736000;//must be changed for mainet
        return true;
    }

     function cBLP(address member, address asset) public onlyDAO returns (uint claimAmount){
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
    function cFMember(address asset, address member) public onlyDAO returns (bool){
        require(mapAddress_listedAssets[asset].bondedLP[member] > 0, '!bondedlps');
        require(mapAddress_listedAssets[asset].isMember[member], '!deposited');
        uint256 _claimable = cBLP(member, asset); 
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