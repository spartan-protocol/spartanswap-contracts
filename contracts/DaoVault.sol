pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import "./cInterfaces.sol"; 
interface iDAO {
     function DAO() external view returns (address);
     function MSTATUS() external view returns(bool);
    function UTILS() external view returns(address);
}
interface iNDAO {
    function DAO() external view returns (iDAO);
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
    using SafeMath for uint;
    address public BASE;
    address public NDAO;
    uint256 public totalWeight;
     constructor (address _base, address _newDAO) public payable {
        BASE = _base;
         NDAO = _newDAO;
    }
    mapping(address => bool) public isMember; // Is Member
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
       require(iPOOL(pool).transferTo(address(this), amount), 'sendlps');
        mapMemberPool_balance[member][pool] = mapMemberPool_balance[member][pool].add(amount); // Record total pool balance for member
        increaseWeight(pool, member);
        return true;
}

 // Anyone can update a member's weight, which is their claim on the BASE in the associated pool
    function increaseWeight(address pool, address member) public returns(uint){
        if(mapMemberPool_weight[member][pool] > 0){ // Remove previous weights
            totalWeight = totalWeight.sub(mapMemberPool_weight[member][pool]);
            mapMember_weight[member] = mapMember_weight[member].sub(mapMemberPool_weight[member][pool]);
            mapMemberPool_weight[member][pool] = 0;
        }else {
            mapMember_poolArray[member].push(pool);
        }
        uint weight = iUTILS(_DAO().UTILS()).getPoolShareWeight(iPOOL(pool).TOKEN(), mapMemberPool_balance[member][pool]); // Get claim on BASE in pool
        mapMemberPool_weight[member][pool] = weight;
        mapMember_weight[member] = mapMember_weight[member].add(weight);
        totalWeight = totalWeight.add(weight);

        return weight;
    }
    function updateWeight(address member) public {
       uint memberPool =  mapMember_poolArray[member].length;
       for(uint i = 0; i < memberPool; i++){
           increaseWeight(mapMember_poolArray[member][i], member);
       }
    }

 function decreaseWeight(address pool, address member, uint amount) internal {
        uint weightRemoved =  iUTILS(_DAO().UTILS()).getPoolShareWeight(iPOOL(pool).TOKEN(), amount); // Get claim on BASE in pool
        totalWeight = totalWeight.sub(weightRemoved); // Remove that weight
        mapMember_weight[member] = mapMember_weight[member].sub(weightRemoved); // Reduce weight
    }


function withdraw(address pool, uint amount, address member) public onlyDAO returns (bool){
         mapMemberPool_balance[member][pool] =  mapMemberPool_balance[member][pool].sub(amount);
        uint weight = iUTILS(_DAO().UTILS()).getPoolShareWeight(iPOOL(pool).TOKEN(), mapMemberPool_balance[member][pool]); // Get claim on BASE in pool
        mapMemberPool_weight[member][pool] = weight;
        require(amount > 0, "!Balance");
        decreaseWeight(pool, member, amount);
        require(iBEP20(pool).transfer(member, amount), "Must transfer"); // Then transfer
        return true;
}

function getMemberWeight(address member) public view returns (uint){
        return mapMember_weight[member];
    }

}
