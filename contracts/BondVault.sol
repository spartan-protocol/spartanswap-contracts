pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import "./cInterfaces.sol"; 
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
    using SafeMath for uint;
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
        bool status = iDAO(NDAO).MSTATUS();
        if(status == true){
         return iBASE(BASE).DAO();
        }else{
          return iNDAO(NDAO).DAO();
        }
    }

      function migrateMemberDetails(address member, address asset, address oldBond) public onlyDAO returns (bool){
        MemberDetails memory memberDetails = BondVault(oldBond).getMemberDetails(member, asset);
        mapAddress_listedAssets[asset].isMember[member] = memberDetails.isMember;
        mapAddress_listedAssets[asset].bondedLP[member] = memberDetails.bondedLP;
        mapAddress_listedAssets[asset].claimRate[member] = memberDetails.claimRate;
        mapAddress_listedAssets[asset].lastBlockTime[member] = memberDetails.lastBlockTime;
        return true;
    }
    


    function depForMember(address asset, address member, uint LPS) public onlyDAO returns(bool){
         if(!mapAddress_listedAssets[asset].isMember[member]){
          mapAddress_listedAssets[asset].isMember[member] = true;
          arrayMembers.push(member);
          mapAddress_listedAssets[asset].members.push(member);
        }
        if(mapAddress_listedAssets[asset].bondedLP[member] > 0){
            cFMember(asset, member);
        }
        mapAddress_listedAssets[asset].bondedLP[member] = mapAddress_listedAssets[asset].bondedLP[msg.sender].add(LPS);
        mapAddress_listedAssets[asset].lastBlockTime[member] = block.timestamp;
        mapAddress_listedAssets[asset].claimRate[member] = mapAddress_listedAssets[asset].bondedLP[msg.sender].div(iBOND(_DAO().BOND()).bondingPeriodSeconds());
    }
    function depINIT(address asset, address member, uint LPS) public onlyDAO returns (bool){
         if(!mapAddress_listedAssets[asset].isMember[member]){
          mapAddress_listedAssets[asset].isMember[member] = true;
          arrayMembers.push(member);
          mapAddress_listedAssets[asset].members.push(member);
        }
        mapAddress_listedAssets[asset].bondedLP[member] = mapAddress_listedAssets[asset].bondedLP[member].add(LPS);
        mapAddress_listedAssets[asset].lastBlockTime[member] = block.timestamp;
        mapAddress_listedAssets[asset].claimRate[member] = mapAddress_listedAssets[asset].bondedLP[member].div(23328000);//must be changed for mainet
        
    }

     function cBLP(address member, address asset) public onlyDAO returns (uint){
        uint256 secondsSinceClaim = block.timestamp.sub(mapAddress_listedAssets[asset].lastBlockTime[member]); // Get time since last claim
        uint256 rate = mapAddress_listedAssets[asset].claimRate[member];
        uint claimAmount;
        if(secondsSinceClaim >= iBOND(_DAO().BOND()).bondingPeriodSeconds()){
            mapAddress_listedAssets[asset].claimRate[member] = 0;
            claimAmount = mapAddress_listedAssets[asset].bondedLP[member];
        }else {
            claimAmount = secondsSinceClaim.mul(rate);
        }
        return claimAmount;
    }
    function cFMember(address asset, address member) public onlyDAO returns (bool){
        require(mapAddress_listedAssets[asset].bondedLP[member] > 0, '!bondedlps');
        require(mapAddress_listedAssets[asset].isMember[member], '!deposited');
        uint256 claimable = cBLP(member, asset); 
        address _pool = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(asset);
        require(claimable <= mapAddress_listedAssets[asset].bondedLP[member],'attempted to overclaim');
        mapAddress_listedAssets[asset].lastBlockTime[member] = block.timestamp;
        mapAddress_listedAssets[asset].bondedLP[member] = mapAddress_listedAssets[asset].bondedLP[member].sub(claimable);
        iBEP20(_pool).transfer(member, claimable); // send LPs to user
        return true;
    }
     function memberCount() public view returns (uint256 count){
        return arrayMembers.length;
    }
    function allMembers() public view returns (address[] memory _allMembers){
        return arrayMembers;
    }

    function getMemberDetails(address member, address asset) public view returns (MemberDetails memory memberDetails){
        memberDetails.isMember = mapAddress_listedAssets[asset].isMember[member];
        memberDetails.bondedLP = mapAddress_listedAssets[asset].bondedLP[member];
        memberDetails.claimRate = mapAddress_listedAssets[asset].claimRate[member];
        memberDetails.lastBlockTime = mapAddress_listedAssets[asset].lastBlockTime[member];
        return memberDetails;
    }
     
}