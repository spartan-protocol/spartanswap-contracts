// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iBEP20.sol";
import "@nomiclabs/buidler/console.sol";
interface iSYNTHFACTORY {
    function isSynth(address) external view returns(bool);
}
interface iDAO {
    function ROUTER() external view returns(address);
    function RESERVE() external view returns(address);
    function UTILS() external view returns(address);
    function DAO() external view returns (address);
    function LEND() external view returns (address);
    function POOLFACTORY() external view returns (address);
    function SYNTHFACTORY() external view returns (address);
}
interface iRESERVE {
    function grantFunds(uint, address) external returns(bool); 
}
interface iBASE {
    function DAO() external view returns (iDAO);
    function transferTo(address, uint256 ) external payable returns(bool);
    function secondsPerEra() external view returns (uint256);
}
interface iUTILS {
    function calcPart(uint,uint) external view returns (uint );
    function calcShare(uint,uint, uint) external view returns (uint );
    function calcSwapValueInBase(address, uint) external view returns(uint); 
    function calcSpotValueInBase(address, uint) external view returns(uint);
    function calcSwapValueInToken(address, uint) external view returns (uint value);
}
interface iSYNTH {
    function LayerONE() external view returns(address);
    function mintSynth(address, address) external returns (uint);
    function transferTo(address, uint256 ) external payable returns(bool);
}
interface iPOOLFACTORY {
    function getPool(address) external view returns(address payable);
}
interface iPOOL {
    function mintSynths(address, address) external returns(uint, uint);
}


contract SynthVault { 
    address public BASE;
    address public DEPLOYER;

    uint public minimumDepositTime;
    uint public totalWeight;
    uint public totalRewards;
    uint public erasToEarn;
    uint public blockDelay;
    uint256 public vaultClaim;

    
 // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _; 
    }


    constructor (address _base) public {
        BASE = _base;
        DEPLOYER = msg.sender; 
        erasToEarn = 30;
        minimumDepositTime = 1;
        blockDelay = 0;
        vaultClaim = 1000;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }
    mapping(address => uint) private mapToken_totalFunds;
    mapping(address => uint) private mapMember_weight;
    mapping(address => mapping(address => uint)) private mapMemberToken_deposit;
    mapping(address => mapping(address => uint)) private mapMemberToken_reward;
    mapping(address => mapping(address => uint)) private mapMemberToken_lastTime;
    mapping(address => uint) public lastBlock;

    // Events
    event MemberDeposits(address indexed token, address indexed member, uint newDeposit, uint totalDeposit, uint weight, uint totalWeight);
    event MemberWithdraws(address indexed token, address indexed member, uint amount, uint weight, uint totalWeight);
    event MemberHarvests(address indexed token, address indexed member, uint amount);

   function setParams(uint one, uint two, uint three, uint four) external onlyDAO {
        erasToEarn = one;
        minimumDepositTime = two;
        blockDelay = three;
        vaultClaim = four;
    }

   //======================================DEPOSITS========================================//

    // Holders to deposit for Interest Payments
    function deposit(address token, uint amount) external {
        depositForMember(token, msg.sender, amount);
    }
    
    function depositForMember(address token, address member, uint amount) public {
        require(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(token), "!synth");
         getFunds(token, amount);
        _deposit(token, member, amount);
    }
    function _deposit(address _token, address _member, uint _amount) internal {
        mapMemberToken_lastTime[_member][_token] = block.timestamp;
        mapMemberToken_deposit[_member][_token] += _amount; // Record balance for member
        uint _weight = iUTILS(_DAO().UTILS()).calcSpotValueInBase(iSYNTH(_token).LayerONE(), _amount);
        mapToken_totalFunds[_token] += _amount;
        mapMember_weight[_member] += _weight;
        totalWeight += _weight;
        emit MemberDeposits(_token, _member, _amount, mapToken_totalFunds[_token], _weight, totalWeight);
    }

     //====================================== HARVEST ========================================//

    function harvest(address token) external returns(uint reward) {
        address _member = msg.sender;
        reward = calcCurrentReward(token, _member);
        console.log(reward);
        mapMemberToken_lastTime[_member][token] = block.timestamp;
        mapMemberToken_reward[_member][token] += reward;
        totalRewards += reward;
        emit MemberHarvests(token, _member, reward);
        return reward;
    }

    function calcCurrentReward(address token, address member) public view returns(uint reward) {
        uint _secondsSinceClaim = block.timestamp - mapMemberToken_lastTime[member][token];        // Get time since last claim
        console.log("_secondsSinceClaim ", _secondsSinceClaim);
        uint _share = calcReward(member);  
        console.log("_share ",_share);  
        console.log("_totalWeight ",totalWeight);  
                                                        // Get share of rewards for member
        reward = (_share * _secondsSinceClaim) / iBASE(BASE).secondsPerEra();  
        return reward;
    }

    function calcReward(address member) public view returns(uint) {
        uint _weight = mapMember_weight[member];
        uint _reserve = reserveBASE()/erasToEarn;  
        uint _vaultReward = (_reserve * vaultClaim) / 10000;                   
        return iUTILS(_DAO().UTILS()).calcShare(_weight, totalWeight, _vaultReward);         // Get member's share of that
     }

    //====================================== WITHDRAW ========================================//
     // Members to withdraw
    function withdraw(address token, uint basisPoints) external returns(uint redeemedAmount) {
        address _member = msg.sender;
        redeemedAmount = _processWithdraw(token, _member, basisPoints);                         // get amount to withdraw
        require(iBEP20(token).transfer(_member, redeemedAmount));
        return redeemedAmount;
    }
    function _processWithdraw(address _token, address _member, uint _basisPoints) internal returns(uint _amount) {
        require((block.timestamp - mapMemberToken_lastTime[_member][_token]) >= minimumDepositTime, "DepositTime");    // stops attacks
        uint _reward = iUTILS(_DAO().UTILS()).calcPart(_basisPoints, mapMemberToken_reward[_member][_token]); // share of reward
        mapMemberToken_reward[_member][_token] -= _reward;
        totalRewards -= _reward;
        address _poolOUT = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(_token);
        iRESERVE(_DAO().RESERVE()).grantFunds(_reward, _poolOUT);
        iPOOL(_poolOUT).mintSynths(iSYNTH(_token).LayerONE(), address(this));
        uint _principle = iUTILS(_DAO().UTILS()).calcPart(_basisPoints, mapMemberToken_deposit[_member][_token]); // share of deposits
        mapMemberToken_deposit[_member][_token] -= _principle;                                   
        mapToken_totalFunds[_token] -= _principle;
        uint _weight = iUTILS(_DAO().UTILS()).calcPart(_basisPoints, mapMember_weight[_member]);
        mapMember_weight[_member] -= _weight; 
        totalWeight -= _weight;                                                     // reduce for total
        emit MemberWithdraws(_token, _member, _amount, _weight, totalWeight);
        return (_principle + _reward);
    }


    //============================== ASSETS ================================//
    function getFunds(address _token, uint _amount) internal {
        if(tx.origin==msg.sender){
                require(iSYNTH(_token).transferTo(address(this), _amount)); 
        }else{
                require(iBEP20(_token).transferFrom(msg.sender, address(this), _amount));
        }
    }

    //================================ HELPERS ===============================//
    function reserveBASE() public view returns(uint) {
        return iBEP20(BASE).balanceOf(_DAO().RESERVE()); 
    }
    function getTokenDeposits(address token) external view returns(uint) {
        return mapToken_totalFunds[token];
    }
    function getMemberDeposit(address token, address member) external view returns(uint){
        return mapMemberToken_deposit[member][token];
    }
    function getMemberReward(address token, address member) external view returns(uint){
        return mapMemberToken_reward[member][token];
    }
    function getMemberWeight(address member) external view returns(uint){
        return mapMember_weight[member];
    }
    function getMemberLastTime(address token, address member) external view returns(uint){
        return mapMemberToken_lastTime[member][token];
    }




   // deposit synths external
   // harvest rewards external
   // calc rewards internal
   // Buy synths internal
   // helpers for memberRewards


}