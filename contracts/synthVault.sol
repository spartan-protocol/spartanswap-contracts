// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iBEP20.sol";
//  import "@nomiclabs/buidler/console.sol";
interface iSYNTHFACTORY {
    function isSynth(address) external view returns (bool);
}
interface iDAO {
    function ROUTER() external view returns (address);
    function RESERVE() external view returns (address);
    function UTILS() external view returns (address);
    function DAO() external view returns (address);
    function MSTATUS() external view returns(bool);
    function LEND() external view returns (address);
    function POOLFACTORY() external view returns (address);
    function SYNTHFACTORY() external view returns (address);
}
interface iNDAO {
    function DAO() external view returns (iDAO);
}
interface iRESERVE {
    function grantFunds(uint256, address) external returns (bool);
    function emissions() external returns(bool); 
}
interface iBASE {
    function DAO() external view returns (iDAO);
    function transferTo(address, uint256) external payable returns (bool);
    function secondsPerEra() external view returns (uint256);
}

interface iUTILS {
    function calcPart(uint256, uint256) external view returns (uint256);

    function calcShare(
        uint256,
        uint256,
        uint256
    ) external view returns (uint256);

    function calcSwapValueInBase(address, uint256)
        external
        view
        returns (uint256);

    function calcSpotValueInBase(address, uint256)
        external
        view
        returns (uint256);

    function calcSwapValueInToken(address, uint256)
        external
        view
        returns (uint256 value);
}

interface iSYNTH {
    function LayerONE() external view returns (address);

    function mintSynth(address, address) external returns (uint256);

    function transferTo(address, uint256) external payable returns (bool);
}

interface iPOOLFACTORY {
    function getPool(address) external view returns (address payable);
}

interface iPOOL {
    function mintSynths(address, address) external returns (uint256, uint256);
}

contract SynthVault {
    address public BASE;
    address public DEPLOYER;

    uint256 public minimumDepositTime;
    uint256 public totalWeight;
    uint256 public erasToEarn;
    uint256 public blockDelay;
    uint256 public vaultClaim;
    address public NDAO;
    address [] public stakedSynthAssets;

    // Only DAO can execute
     modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER );
        _;
    }
    constructor(address _base, address _newDao) public {
        BASE = _base;
        NDAO = _newDao;
        DEPLOYER = msg.sender;
        erasToEarn = 30;
        minimumDepositTime = 1;
        blockDelay = 0;
        vaultClaim = 1000;
    }

    function _DAO() internal view returns(iDAO) {
        bool _status = iDAO(NDAO).MSTATUS();
        if(_status == true){
         return iBASE(BASE).DAO();
        }else{
          return iNDAO(NDAO).DAO();
        }
    }
    function changeNDAO(address _newDAO) external onlyDAO {
        NDAO = _newDAO;
    }
    mapping(address => mapping(address => uint256)) private mapMemberSynth_weight;
    mapping(address => uint256) private mapMemberTotal_weight;
    mapping(address => mapping(address => uint256)) private mapMemberSynth_deposit;

    mapping(address => mapping(address => uint256)) private mapMemberSynth_lastTime;
    mapping(address => uint256) private mapMember_depositTime;
    mapping(address => uint256) public lastBlock;
    mapping(address => bool) private isStakedSynth;
    mapping(address => mapping(address => bool)) private isSynthMember;

    // Events
    event MemberDeposits(
        address indexed synth,
        address indexed member,
        uint256 newDeposit,
        uint256 weight,
        uint256 totalWeight
    );
    event MemberWithdraws(
        address indexed synth,
        address indexed member,
        uint256 amount,
        uint256 weight,
        uint256 totalWeight
    );
    event MemberHarvests(
        address indexed synth,
        address indexed member,
        uint256 amount,
        uint256 weight,
        uint256 totalWeight
    );

    function setParams(
        uint256 one,
        uint256 two,
        uint256 three,
        uint256 four
    ) external onlyDAO {
        erasToEarn = one;
        minimumDepositTime = two;
        blockDelay = three;
        vaultClaim = four;
    }

    //======================================DEPOSITS========================================//

    // Holders to deposit for Interest Payments
    function deposit(address synth, uint256 amount) external {
        depositForMember(synth, msg.sender, amount);
    }

    function depositForMember(
        address synth,
        address member,
        uint256 amount
    ) public {
        require(iSYNTHFACTORY(_DAO().SYNTHFACTORY()).isSynth(synth), "!synth");
        getFunds(synth, amount);
        _deposit(synth, member, amount);
    }
    function _deposit(
        address _synth,
        address _member,
        uint256 _amount
    ) internal {
        if(!isStakedSynth[_synth]){
            isStakedSynth[_synth] = true;
            stakedSynthAssets.push(_synth);
        }
        mapMemberSynth_lastTime[_member][_synth] = block.timestamp;
        mapMember_depositTime[_member] = block.timestamp;
        mapMemberSynth_deposit[_member][_synth] += _amount; // Record balance for member
        uint256 _weight = iUTILS(_DAO().UTILS()).calcSpotValueInBase(iSYNTH(_synth).LayerONE(), _amount);
        mapMemberSynth_weight[_member][_synth] += _weight;
        mapMemberTotal_weight[_member] += _weight;
        totalWeight += _weight;
        isSynthMember[_member][_synth] = true;
        emit MemberDeposits(_synth, _member, _amount, _weight, totalWeight);
    }

    //====================================== HARVEST ========================================//

    function harvestAll() external returns (bool) {
        require(iRESERVE(_DAO().RESERVE()).emissions(), "!EMISSIONS");
        address _member = msg.sender;
        uint256 _weight;
        uint i;
        for(i = 0; i<stakedSynthAssets.length; i++){
            if(isSynthMember[_member][stakedSynthAssets[i]] == true){
                 uint256 reward = calcCurrentReward(stakedSynthAssets[i],_member);
                 if(reward > 0 ){
                 mapMemberSynth_lastTime[_member][stakedSynthAssets[i]] = block.timestamp;
                 address _poolOUT = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(iSYNTH(stakedSynthAssets[i]).LayerONE() );
                 iRESERVE(_DAO().RESERVE()).grantFunds(reward, _poolOUT);
                 (uint synthReward, ) = iPOOL(_poolOUT).mintSynths(stakedSynthAssets[i], address(this));
                 _weight = iUTILS(_DAO().UTILS()).calcSpotValueInBase(iSYNTH(stakedSynthAssets[i]).LayerONE(), synthReward);
                 mapMemberSynth_deposit[_member][stakedSynthAssets[i]] += synthReward;
                 mapMemberTotal_weight[_member] += _weight;
                 totalWeight += _weight;
                emit MemberHarvests(stakedSynthAssets[i], _member, reward, _weight, totalWeight);
                 }
                 
            }
        }
         
        return true;
    }



     function harvestSingle(address synth) external returns (bool) {
        require(iRESERVE(_DAO().RESERVE()).emissions(), "!EMISSIONS");
        address _member = msg.sender;
        uint256 _weight;
        uint256 reward = calcCurrentReward(synth,_member);
        mapMemberSynth_lastTime[_member][synth] = block.timestamp;
        address _poolOUT = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(iSYNTH(synth).LayerONE() );
        iRESERVE(_DAO().RESERVE()).grantFunds(reward, _poolOUT);
        (uint synthReward, ) = iPOOL(_poolOUT).mintSynths(synth, address(this));
        _weight = iUTILS(_DAO().UTILS()).calcSpotValueInBase(iSYNTH(synth).LayerONE(), synthReward);
         mapMemberSynth_deposit[_member][synth] += synthReward;
        mapMemberTotal_weight[_member] += _weight;
        totalWeight += _weight;
        emit MemberHarvests(synth, _member, reward, _weight, totalWeight);
        return true;
    }

    function calcCurrentReward(address synth, address member)
        public
        view
        returns (uint256 reward)
    {
        uint256 _secondsSinceClaim = block.timestamp - mapMemberSynth_lastTime[member][synth]; // Get time since last claim
        uint256 _share = calcReward(synth, member);
        reward = (_share * _secondsSinceClaim) / iBASE(BASE).secondsPerEra();
        return reward;
    }

    function calcReward(address synth, address member) public view returns (uint256) {
        uint256 _weight = mapMemberSynth_weight[member][synth];
        uint256 _reserve = reserveBASE() / erasToEarn;
        uint256 _vaultReward = (_reserve * vaultClaim) / 10000;
        return
            iUTILS(_DAO().UTILS()).calcShare(
                _weight,
                totalWeight,
                _vaultReward
            ); // Get member's share of that
    }

    //====================================== WITHDRAW ========================================//
    // Members to withdraw
    function withdraw(address synth, uint256 basisPoints)
        external
        returns (uint256 redeemedAmount)
    {
        address _member = msg.sender;
        redeemedAmount = _processWithdraw(synth, _member, basisPoints);
        require(iBEP20(synth).transfer(_member, redeemedAmount));
        return redeemedAmount;
    }

    function _processWithdraw(
        address _synth,
        address _member,
        uint256 _basisPoints
    ) internal returns (uint256 synthReward) {
        require(
            (block.timestamp - mapMember_depositTime[_member]) >=
                minimumDepositTime,
            "DepositTime"
        ); // stops attacks
        uint256 _principle = iUTILS(_DAO().UTILS()).calcPart( _basisPoints, mapMemberSynth_deposit[_member][_synth]); // share of deposits
        mapMemberSynth_deposit[_member][_synth] -= _principle;
        uint256 _weight = iUTILS(_DAO().UTILS()).calcPart( _basisPoints, mapMemberSynth_weight[_member][_synth]);
        mapMemberTotal_weight[_member] -= _weight;
        mapMemberSynth_weight[_member][_synth] -= _weight;
        totalWeight -= _weight; // reduce for total
        emit MemberWithdraws(
            _synth,
            _member,
            synthReward,
            _weight,
            totalWeight
        );
        return (_principle + synthReward);
    }

    //============================== ASSETS ================================//
    function getFunds(address _synth, uint256 _amount) internal {
        if (tx.origin == msg.sender) {
            require(iSYNTH(_synth).transferTo(address(this), _amount));
        } else {
            require(
                iBEP20(_synth).transferFrom(msg.sender, address(this), _amount)
            );
        }
    }

    //================================ HELPERS ===============================//
    function reserveBASE() public view returns (uint256) {
        return iBEP20(BASE).balanceOf(_DAO().RESERVE());
    }

    function getMemberDeposit(address synth, address member)
        external
        view
        returns (uint256)
    {
        return mapMemberSynth_deposit[member][synth];
    }

    function getMemberWeight(address member) external view returns (uint256) {
        return mapMemberTotal_weight[member];
    }
    function getStakeSynthLength() external view returns (uint256) {
        return stakedSynthAssets.length;
    }
    function getMemberLastTime(address member)
        external
        view
        returns (uint256)
    {
        return mapMember_depositTime[member];
    }
    function getMemberLastSynthTime(address synth, address member)
        external
        view
        returns (uint256)
    {
        return mapMemberSynth_lastTime[member][synth];
    }
    function getMemberSynthWeight(address synth, address member)
        external
        view
        returns (uint256)
    {
        return mapMemberSynth_weight[member][synth];
    }


}
