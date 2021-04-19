pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;

import "./iBEP20.sol"; 
interface iDAO {
     function DAO() external view returns (address);
     function MSTATUS() external view returns(bool);
    function POOLFACTORY() external view returns(address);
    function UTILS() external view returns(address);
}
interface iNDAO {
    function DAO() external view returns (iDAO);
}
interface iPOOLFACTORY {
   function isCuratedPool(address) external view returns (bool);
    function challengLowestCuratedPool(address) external view returns (bool);
    function addCuratedPool(address) external returns (bool);
    function removeCuratedPool(address) external returns (bool);
    function getPool(address token) external returns (address);
    function getPoolArray(uint i) external returns (address);
    function poolCount() external returns (uint);
    function isPool(address) external returns (bool);
}
interface iBASE {
    function secondsPerEra() external view returns (uint256);
    function DAO() external view returns (iDAO);
    function changeIncentiveAddress(address) external returns(bool);
    function changeDAO(address) external returns(bool);
    function changeEmissionCurve(uint256) external returns(bool);
    function changeEraDuration(uint256) external returns(bool);
    function startEmissions() external returns(bool);
    function stopEmissions() external returns(bool);
    function transferTo(address, uint256) external payable returns(bool);
}
interface iUTILS {
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    function getPoolShareWeight(address token, uint units)external view returns(uint weight);
}
interface iPOOL {
     function removeLiquidity() external returns (uint, uint);
     function transferTo(address, uint) external payable returns(bool);
     function TOKEN() external view returns(address);
}

contract DaoVault {
    address public BASE;
    address public NDAO;
    uint256 public totalWeight;

constructor (address _base, address _newDAO) public payable {
        BASE = _base;
         NDAO = _newDAO;
    }
    mapping(address => mapping(address => uint256)) public mapMemberPool_balance; // Member's balance in pool
    mapping(address => uint256) public mapMember_weight; // Value of weight
    mapping(address => mapping(address => uint256)) public mapMemberPool_weight; // Value of weight for pool
    mapping(address => address[]) public mapMember_poolArray;

modifier onlyDAO() {
        require(msg.sender == _DAO().DAO());
        _;
    }

function _DAO() internal view returns(iDAO) {
        bool status = iDAO(NDAO).MSTATUS();
        if(status == true){
         return iBASE(BASE).DAO();
        }else{
          return iNDAO(NDAO).DAO();
        }
    }

function depositLP(address pool, uint amount, address member) public onlyDAO returns (bool){
       require(iPOOL(pool).transferTo(address(this), amount), 'sendlps');//RPTAF
        mapMemberPool_balance[member][pool] += amount; // Record total pool balance for member
        increaseWeight(pool, member);
        return true;
}

 // Anyone can update a member's weight, which is their claim on the BASE in the associated pool
    function increaseWeight(address pool, address member) internal returns(uint){
        if(mapMemberPool_weight[member][pool] > 0){ // Remove previous weights
            totalWeight -= mapMemberPool_weight[member][pool];
            mapMember_weight[member] -= mapMemberPool_weight[member][pool];
            mapMemberPool_weight[member][pool] = 0;
        }else {
            mapMember_poolArray[member].push(pool);
        }
        uint weight = iUTILS(_DAO().UTILS()).getPoolShareWeight(iPOOL(pool).TOKEN(), mapMemberPool_balance[member][pool]); // Get claim on BASE in pool
        mapMemberPool_weight[member][pool] = weight;
        mapMember_weight[member] += weight;
        totalWeight += weight;
        return weight;
    }

 function decreaseWeight(address pool, address member) internal {
        uint weight = mapMemberPool_weight[member][pool];
        mapMemberPool_balance[member][pool] = 0; // Zero out balance
        mapMemberPool_weight[member][pool] = 0; // Zero out weight
        totalWeight -= weight; // Remove that weight
        mapMember_weight[member] -= weight; // Reduce weight
    }


function withdraw(address pool, address member) public onlyDAO returns (bool ){
        uint256 _balance = mapMemberPool_balance[member][pool];
        require(_balance > 0, "!balance");
        decreaseWeight(pool, member);
        require(iBEP20(pool).transfer(member, _balance), "Must transfer"); // Then transfer
        return true;
}

function getMemberWeight(address member) public view returns (uint){
        return mapMember_weight[member];
    }

}
