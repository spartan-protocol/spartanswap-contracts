// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;

import "./iBEP20.sol";
import "./iDAO.sol";
import "./iBASE.sol";
import "./iPOOL.sol";
import "./iUTILS.sol";
import "./iROUTER.sol";
import "./iRESERVE.sol";

contract DaoVault {
    address public BASE;
    address public DEPLOYER;
    uint256 public totalWeight;

    constructor(address _base) {
        BASE = _base;
        DEPLOYER = msg.sender;
    }

    mapping(address => mapping(address => uint256))
        private mapMemberPool_balance; // Member's balance in pool
    mapping(address => uint256) private mapMember_weight; // Value of weight

    mapping(address => mapping(address => uint256))
        private mapMemberPool_weight; // Value of weight for pool

    modifier onlyDAO() {
        require(
            msg.sender == _DAO().DAO() || msg.sender == DEPLOYER,
            "!DAO"
        );
        _;
    }

    function _DAO() internal view returns (iDAO) {
        return iBASE(BASE).DAO();
    }

    function depositLP( address pool, uint256 amount, address member ) external onlyDAO returns (bool) {
        mapMemberPool_balance[member][pool] += amount; // Record total pool balance for member
        increaseWeight(pool, member);
        return true;
    }

    // Anyone can update a member's weight, which is their claim on the BASE in the associated pool
    function increaseWeight(address pool, address member) internal returns (uint256){
        if (mapMemberPool_weight[member][pool] > 0) {
            totalWeight -= mapMemberPool_weight[member][pool];
            mapMember_weight[member] -= mapMemberPool_weight[member][pool];
            mapMemberPool_weight[member][pool] = 0;
        }
        uint256 weight = iUTILS(_DAO().UTILS()).getPoolShareWeight(iPOOL(pool).TOKEN(),mapMemberPool_balance[member][pool]); 
        mapMemberPool_weight[member][pool] = weight;
        mapMember_weight[member] += weight;
        totalWeight += weight;
        return weight;
    }

    function decreaseWeight(address pool, address member) internal {
        uint256 weight = mapMemberPool_weight[member][pool];
        mapMemberPool_balance[member][pool] = 0; // Zero out balance
        mapMemberPool_weight[member][pool] = 0; // Zero out weight
        totalWeight -= weight; // Remove that weight
        mapMember_weight[member] -= weight; // Reduce weight
    }

    function withdraw(address pool, address member) external onlyDAO returns (bool){
        uint256 _balance = mapMemberPool_balance[member][pool];
        require(_balance > 0, "!balance");
        decreaseWeight(pool, member);
        require(iBEP20(pool).transfer(member, _balance), "!transfer"); // Then transfer
        return true;
    }

    function getMemberWeight(address member) external view returns (uint256) {
        if (mapMember_weight[member] > 0) {
            return mapMember_weight[member];
        } else {
            return 0;
        }
    }

    function getMemberPoolBalance(address pool, address member)  external view returns (uint256){
        return mapMemberPool_balance[member][pool];
    }

    function getMemberPoolWeight(address pool, address member) external view returns (uint256){
        return mapMemberPool_weight[member][pool];
    }
}
