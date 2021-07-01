// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iUTILS.sol";
import "./iRESERVE.sol";
import "./iDAOVAULT.sol";
import "./iROUTER.sol";
import "./iBONDVAULT.sol";
import "./iBASE.sol"; 
import "./iBEP20.sol";
import "./iPOOLFACTORY.sol";
import "./iSYNTHFACTORY.sol";
import "./iSYNTHVAULT.sol";

contract Dao {
    address public DEPLOYER;
    address public BASE;

    uint256 public secondsPerEra;
    uint256 public coolOffPeriod;
    uint256 public proposalCount;
    uint256 public majorityFactor;
    uint256 public erasToEarn;
    uint256 public daoClaim;
    uint256 public daoFee;
    uint256 public currentProposal;
    
    struct MemberDetails {
        bool isMember;
        uint weight;
        uint lastBlock;
        uint poolCount;
    }
    struct ProposalDetails {
        uint id;
        string proposalType;
        uint votes;
        uint coolOffTime;
        bool finalising;
        bool finalised;
        uint param;
        address proposedAddress;
        bool open;
        uint startTime;
    }

    bool public daoHasMoved;
    address public DAO;

    iROUTER private _ROUTER;
    iUTILS private _UTILS;
    iBONDVAULT private _BONDVAULT;
    iDAOVAULT private _DAOVAULT;
    iPOOLFACTORY private _POOLFACTORY;
    iSYNTHFACTORY private _SYNTHFACTORY;
    iRESERVE private _RESERVE;
    iSYNTHVAULT private _SYNTHVAULT;

    address[] public arrayMembers;
    address [] listedBondAssets;
    uint256 public bondingPeriodSeconds = 15552000;// 6 months
    
    mapping(address => bool) public isMember;
    mapping(address => bool) public isListed;
    mapping(address => uint256) public mapMember_lastTime;

    mapping(uint256 => uint256) public mapPID_param;
    mapping(uint256 => address) public mapPID_address;
    mapping(uint256 => string) public mapPID_type;
    mapping(uint256 => uint256) public mapPID_votes;
    mapping(uint256 => uint256) public mapPID_coolOffTime;
    mapping(uint256 => bool) public mapPID_finalising;
    mapping(uint256 => bool) public mapPID_finalised;
    mapping(uint256 => bool) public mapPID_open;
    mapping(uint256 => uint256) public mapPID_startTime;
    mapping(uint256 => mapping(address => uint256)) public mapPIDMember_votes;

    event MemberDeposits(address indexed member,address indexed pool,uint256 amount);
    event MemberWithdraws(address indexed member,address indexed pool,uint256 balance);

    event NewProposal(address indexed member, uint indexed proposalID, string proposalType);
    event NewVote(address indexed member, uint indexed proposalID, uint voteWeight, uint totalVotes, string proposalType);
    event RemovedVote(address indexed member, uint indexed proposalID, uint voteWeight, uint totalVotes, string proposalType);
    event ProposalFinalising(address indexed member, uint indexed proposalID, uint timeFinalised, string proposalType);
    event CancelProposal(address indexed member, uint indexed proposalID);
    event FinalisedProposal(address indexed member, uint indexed proposalID, uint votesCast, uint totalWeight, string proposalType);
    event ListedAsset(address indexed DAO, address indexed asset);
    event DelistedAsset(address indexed DAO, address indexed asset);
    event DepositAsset(address indexed owner, uint256 depositAmount, uint256 bondedLP);

    modifier onlyDAO() {
        require(msg.sender == DEPLOYER);
        _;
    }

    constructor (address _base){
        BASE = _base;
        DEPLOYER = msg.sender;
        DAO = address(this);
        coolOffPeriod = 1;
        erasToEarn = 30;
        majorityFactor = 6666;
        daoClaim = 1000;
        daoFee = 100;
        proposalCount = 0;
        secondsPerEra = iBASE(BASE).secondsPerEra();
    }

    //======================================PROTOCOL CONTRACTs SETTER==================================//
    function setGenesisAddresses(address _router, address _utils, address _reserve) external onlyDAO {
        _ROUTER = iROUTER(_router);
        _UTILS = iUTILS(_utils);
        _RESERVE = iRESERVE(_reserve);
    }

    function setVaultAddresses(address _daovault,address _bondvault, address _synthVault) external onlyDAO {
        _DAOVAULT = iDAOVAULT(_daovault);
        _BONDVAULT = iBONDVAULT(_bondvault);
        _SYNTHVAULT = iSYNTHVAULT(_synthVault); 
    }
    
    function setFactoryAddresses(address _poolFactory, address _synthFactory) external onlyDAO {
        _POOLFACTORY = iPOOLFACTORY(_poolFactory);
        _SYNTHFACTORY = iSYNTHFACTORY(_synthFactory);
    }

    function setGenesisFactors(uint32 _coolOff, uint32 _daysToEarn, uint32 _majorityFactor, uint32 _daoClaim, uint32 _daoFee) external onlyDAO {
        coolOffPeriod = _coolOff;
        erasToEarn = _daysToEarn;
        majorityFactor = _majorityFactor;
        daoClaim = _daoClaim;
        daoFee = _daoFee;
    }

    function purgeDeployer() external onlyDAO {
        DEPLOYER = address(0);
    }

    function changeBondingPeriod(uint256 bondingSeconds) external onlyDAO{
        bondingPeriodSeconds = bondingSeconds;
    }

    //============================== USER - DEPOSIT/WITHDRAW ================================//

    // Member deposits some LP tokens
    function deposit(address pool, uint256 amount) external {
        depositLPForMember(pool, amount, msg.sender);
    }

    // Contract deposits some LP tokens for member
    function depositLPForMember(address pool, uint256 amount, address member) public {
        require(_POOLFACTORY.isCuratedPool(pool) == true, "!curated");
        require(amount > 0, "!amount");
        if (isMember[member] != true) {
            arrayMembers.push(member);
            isMember[member] = true;
        }
        if((_DAOVAULT.getMemberWeight(member) + _BONDVAULT.getMemberWeight(member)) > 0) {
                harvest();
        }
        require(iBEP20(pool).transferFrom(msg.sender, address(_DAOVAULT), amount), "!funds" );
        _DAOVAULT.depositLP(pool, amount, member);
        mapMember_lastTime[member] = block.timestamp;
        emit MemberDeposits(member, pool, amount);
    }
    
    // Member withdraws all from a pool
    function withdraw(address pool) external {
        removeVote();
        require(_DAOVAULT.withdraw(pool, msg.sender), "!transfer"); // Then transfer
    }

     //============================== REWARDS ================================//
    // Rewards
    function harvest() public {
        require(_RESERVE.emissions(), "!emissions");
        uint reward = calcCurrentReward(msg.sender);
        mapMember_lastTime[msg.sender] = block.timestamp;
        uint reserve = iBEP20(BASE).balanceOf(address(_RESERVE));
        uint daoReward = (reserve * daoClaim) / 10000;
        if(reward > daoReward){
            reward = daoReward;
        }
        _RESERVE.grantFunds(reward, msg.sender); 
    }

    function calcCurrentReward(address member) public view returns(uint){
        require(isMember[member], "!member");
        uint secondsSinceClaim = block.timestamp - mapMember_lastTime[member]; // Get time since last claim
        uint share = calcReward(member);    // get share of rewards for member
        uint reward = (share * secondsSinceClaim) / secondsPerEra;    // Get owed amount, based on per-day rates
        return reward;
    }

    function calcReward(address member) public view returns(uint){
        uint weight = _DAOVAULT.getMemberWeight(member) + _BONDVAULT.getMemberWeight(member);  
        uint _totalWeight = _DAOVAULT.totalWeight() + _BONDVAULT.totalWeight();  
        uint reserve = iBEP20(BASE).balanceOf(address(_RESERVE)) / erasToEarn; // Aim to deplete reserve over a number of days
        uint daoReward = (reserve * daoClaim) / 10000;
        return _UTILS.calcShare(weight, _totalWeight, daoReward); // Get member's share of that
    }

    //================================ BOND Feature ==================================//

    function burnBalance() external onlyDAO returns (bool){
        uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
        iBASE(BASE).burn(baseBal);   
        return true;
    }

    function moveBASEBalance(address newDAO) external onlyDAO {
         uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
         iBEP20(BASE).transfer(newDAO, baseBal);
    }

    function listBondAsset(address asset) external onlyDAO {
        if(!isListed[asset]){
            isListed[asset] = true;
            listedBondAssets.push(asset);
        }
        emit ListedAsset(msg.sender, asset);
    }

    function delistBondAsset(address asset) external onlyDAO {
        isListed[asset] = false;
        emit DelistedAsset(msg.sender, asset);
    }

    function bond(address asset, uint256 amount) external payable returns (bool success) {
        require(amount > 0, '!amount');
        require(isListed[asset], '!listed');
        if (isMember[msg.sender] != true) {
            arrayMembers.push(msg.sender);
            isMember[msg.sender] = true;
        }
        if((_DAOVAULT.getMemberWeight(msg.sender) + _BONDVAULT.getMemberWeight(msg.sender)) > 0) {
                harvest();
        }
        uint256 liquidityUnits = handleTransferIn(asset, amount);
        _BONDVAULT.depositForMember(asset, msg.sender, liquidityUnits);
         mapMember_lastTime[msg.sender] = block.timestamp;
        emit DepositAsset(msg.sender, amount, liquidityUnits);
        return true;
    }

    function handleTransferIn(address _token, uint _amount) internal returns (uint LPunits){
        uint256 spartaAllocation = _UTILS.calcSwapValueInBase(_token, _amount); 
        if(iBEP20(BASE).allowance(address(this), address(_ROUTER)) < spartaAllocation){
                    iBEP20(BASE).approve(address(_ROUTER), iBEP20(BASE).totalSupply());  
                }
        if(_token == address(0)){
                require((_amount == msg.value), "!amount");
                LPunits = _ROUTER.addLiquidityForMember{value:_amount}(spartaAllocation, _amount, _token, address(_BONDVAULT));
            } else {
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount);
                if(iBEP20(_token).allowance(address(this), address(_ROUTER)) < _amount){
                    uint256 approvalTNK = iBEP20(_token).totalSupply();  
                    iBEP20(_token).approve(address(_ROUTER), approvalTNK);  
                }
                LPunits = _ROUTER.addLiquidityForMember(spartaAllocation, _amount, _token, address(_BONDVAULT));
            } 
    }

    function claimAllForMember(address member) external returns (bool){
        address [] memory listedAssets = listedBondAssets;
        for(uint i =0; i < listedAssets.length; i++){
            uint claimA = calcClaimBondedLP(member,listedAssets[i]);
            if(claimA > 0){
               _BONDVAULT.claimForMember(listedAssets[i],member);
            }
        }
        return true;
    }

    function claimForMember(address asset) external returns (bool){
        uint claimA = calcClaimBondedLP(msg.sender,asset);
            if(claimA > 0){
               _BONDVAULT.claimForMember(asset,msg.sender);
            }
        return true;
    }
    
    function calcClaimBondedLP(address bondedMember, address asset) public returns (uint){
        uint claimAmount = _BONDVAULT.calcBondedLP(bondedMember, asset);   
        return claimAmount;
    }

    //============================== CREATE PROPOSALS ================================//

    // New ID, but specify type, one type for each function call
    // Votes counted to IDs
    // IDs are finalised
    // IDs are executed, but type specifies unique logic

    // Simple Action Call
    function newActionProposal(string memory typeStr) external returns(uint) {
        checkProposal();
        payFee();
        mapPID_type[currentProposal] = typeStr;
        emit NewProposal(msg.sender, currentProposal, typeStr);
        return currentProposal;
    }

    // Action with uint parameter
    function newParamProposal(uint32 param, string memory typeStr) external returns(uint) {
        checkProposal();
        payFee();
        mapPID_param[currentProposal] = param;
        mapPID_type[currentProposal] = typeStr;
        emit NewProposal(msg.sender, currentProposal, typeStr);
        return currentProposal;
    }

    // Action with address parameter
    function newAddressProposal(address proposedAddress, string memory typeStr) external returns(uint) {
        checkProposal();
        payFee();
        mapPID_address[currentProposal] = proposedAddress;
        mapPID_type[currentProposal] = typeStr;
        emit NewProposal(msg.sender, currentProposal, typeStr);
        return currentProposal;
    }

    // Action with funding
    function newGrantProposal(address recipient, uint amount) external returns(uint) {
        checkProposal();
        payFee();
        string memory typeStr = "GRANT";
        mapPID_type[currentProposal] = typeStr;
        mapPID_address[currentProposal] = recipient;
        mapPID_param[currentProposal] = amount;
        emit NewProposal(msg.sender, currentProposal, typeStr);
        return currentProposal;
    }

    function checkProposal() internal {
        require(mapPID_open[currentProposal] == false, '!open');
        proposalCount += 1;
        currentProposal = proposalCount;
        mapPID_open[currentProposal] = true;
        mapPID_startTime[currentProposal] = block.timestamp;
    }
    
    function payFee() internal returns(bool){
        uint _amount = daoFee*(10**18);
        require(iBEP20(BASE).transferFrom(msg.sender, address(_RESERVE), _amount), '!fee' ); 
        return true;
    } 

    //============================== VOTE && FINALISE ================================//
    // Vote for a proposal
    function voteProposal() external returns (uint voteWeight) {
        require(mapPID_open[currentProposal] == true, "!open");
        bytes memory _type = bytes(mapPID_type[currentProposal]);
        voteWeight = countVotes();
        if(hasQuorum(currentProposal) && mapPID_finalising[currentProposal] == false){
            if(isEqual(_type, 'DAO') || isEqual(_type, 'UTILS') || isEqual(_type, 'RESERVE') ||isEqual(_type, 'GET_SPARTA') || isEqual(_type, 'ROUTER') || isEqual(_type, 'LIST_BOND')|| isEqual(_type, 'GRANT')|| isEqual(_type, 'ADD_CURATED_POOL')){
                if(hasMajority(currentProposal)){
                    _finalise();
                }
            } else {
                _finalise();
            }
        }
        emit NewVote(msg.sender, currentProposal, voteWeight, mapPID_votes[currentProposal], string(_type));
    }

    //Remove vote from a proposal
    function removeVote() public returns (uint voteWeightRemoved){
        bytes memory _type = bytes(mapPID_type[currentProposal]);
        voteWeightRemoved = mapPIDMember_votes[currentProposal][msg.sender]; // get voted weight
        if(mapPID_open[currentProposal]){
            mapPID_votes[currentProposal] -= voteWeightRemoved; // remove voteweight from totalVotingweight
        }
        mapPIDMember_votes[currentProposal][msg.sender] = 0; // zero out voting weight for member
        emit RemovedVote(msg.sender, currentProposal, voteWeightRemoved, mapPID_votes[currentProposal], string(_type));
        return voteWeightRemoved;
    }

    function _finalise() internal {
        bytes memory _type = bytes(mapPID_type[currentProposal]);
        mapPID_finalising[currentProposal] = true;
        mapPID_coolOffTime[currentProposal] = block.timestamp;
        emit ProposalFinalising(msg.sender, currentProposal, block.timestamp+coolOffPeriod, string(_type));
    }

    function cancelProposal() external {
        require(block.timestamp > (mapPID_startTime[currentProposal] + 600), "!days");
        mapPID_votes[currentProposal] = 0;
        mapPID_open[currentProposal] = false;
        emit CancelProposal(msg.sender, currentProposal);
    }

    // Proposal with quorum can finalise after cool off period
    function finaliseProposal() external {
        require((block.timestamp - mapPID_coolOffTime[currentProposal]) > coolOffPeriod, "!cooloff");
        require(mapPID_finalising[currentProposal] == true, "!finalising");
        if(!hasQuorum(currentProposal)){
            mapPID_finalising[currentProposal] = false;
        }
        else {
            bytes memory _type = bytes(mapPID_type[currentProposal]);
            if(isEqual(_type, 'DAO')){
                moveDao(currentProposal);
            } else if (isEqual(_type, 'ROUTER')) {
                moveRouter(currentProposal);
            } else if (isEqual(_type, 'UTILS')){
                moveUtils(currentProposal);
            } else if (isEqual(_type, 'RESERVE')){
                moveReserve(currentProposal);
            }  else if (isEqual(_type, 'FLIP_EMISSIONS')){
                flipEmissions(currentProposal);
            } else if (isEqual(_type, 'COOL_OFF')){
                changeCooloff(currentProposal);
            } else if (isEqual(_type, 'ERAS_TO_EARN')){
                changeEras(currentProposal);
            } else if (isEqual(_type, 'GRANT')){
                grantFunds(currentProposal);
            } else if (isEqual(_type, 'GET_SPARTA')){
                _increaseSpartaAllocation(currentProposal);
            } else if (isEqual(_type, 'LIST_BOND')){
                _listBondingAsset(currentProposal);
            } else if (isEqual(_type, 'DELIST_BOND')){
                _delistBondingAsset(currentProposal);
            } else if (isEqual(_type, 'ADD_CURATED_POOL')){
                _addCuratedPool(currentProposal);
            } else if (isEqual(_type, 'REMOVE_CURATED_POOL')){
                _removeCuratedPool(currentProposal);
            } 
        }
    }

    function moveDao(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "!address");
        DAO = _proposedAddress;
        iBASE(BASE).changeDAO(_proposedAddress);
        daoHasMoved = true; 
        completeProposal(_proposalID);
    }

    function moveRouter(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "!address");
        _ROUTER = iROUTER(_proposedAddress);
        completeProposal(_proposalID);
    }

    function moveUtils(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "!address");
        _UTILS = iUTILS(_proposedAddress);
        completeProposal(_proposalID);
    }

    function moveReserve(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "!address");
        _RESERVE = iRESERVE(_proposedAddress);
        completeProposal(_proposalID);
    }

    function flipEmissions(uint _proposalID) internal {
        iBASE(BASE).flipEmissions();
        completeProposal(_proposalID);
    }

    function changeCooloff(uint _proposalID) internal {
        uint256 _proposedParam = mapPID_param[_proposalID];
        require(_proposedParam != 0, "!param");
        coolOffPeriod = _proposedParam;
        completeProposal(_proposalID);
    }

    function changeEras(uint _proposalID) internal {
        uint256 _proposedParam = mapPID_param[_proposalID];
        require(_proposedParam != 0, "!param");
        erasToEarn = _proposedParam;
        completeProposal(_proposalID);
    }

    function grantFunds(uint _proposalID) internal {
        uint256 _proposedAmount = mapPID_param[_proposalID];
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAmount != 0, "!param");
        require(_proposedAddress != address(0), "!address");
        _RESERVE.grantFunds(_proposedAmount, _proposedAddress);
        completeProposal(_proposalID);
    }

    function _increaseSpartaAllocation(uint _proposalID) internal {
        uint256 _2point5m = 2.5*10**6*10**18;//_2.5m
        iBASE(BASE).mintFromDAO(_2point5m, address(this)); 
        completeProposal(_proposalID);
    }

    function _listBondingAsset(uint _proposalID) internal {
         address _proposedAddress = mapPID_address[_proposalID];
        if(!isListed[_proposedAddress]){
            isListed[_proposedAddress] = true;
            listedBondAssets.push(_proposedAddress);
        }
        completeProposal(_proposalID);
    }

    function _delistBondingAsset(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
         isListed[_proposedAddress] = false;
        completeProposal(_proposalID);
    }

    function _addCuratedPool(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        _POOLFACTORY.addCuratedPool(_proposedAddress); 
        completeProposal(_proposalID);
    }

    function _removeCuratedPool(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        _POOLFACTORY.removeCuratedPool(_proposedAddress); 
        completeProposal(_proposalID);
    }
    
    function completeProposal(uint _proposalID) internal {
        string memory _typeStr = mapPID_type[_proposalID];
        emit FinalisedProposal(msg.sender, _proposalID, mapPID_votes[_proposalID],_DAOVAULT.totalWeight(), _typeStr);
        mapPID_votes[_proposalID] = 0;
        mapPID_finalised[_proposalID] = true;
        mapPID_finalising[_proposalID] = false;
        mapPID_open[_proposalID] = false;
    }

    //============================== CONSENSUS ================================//
    function countVotes() internal returns (uint voteWeight){
        mapPID_votes[currentProposal] -= mapPIDMember_votes[currentProposal][msg.sender];
        voteWeight = _DAOVAULT.getMemberWeight(msg.sender) + _BONDVAULT.getMemberWeight(msg.sender); 
        mapPID_votes[currentProposal] += voteWeight;
        mapPIDMember_votes[currentProposal][msg.sender] = voteWeight;
        return voteWeight;
    }

    function hasMajority(uint _proposalID) public view returns(bool){
        uint votes = mapPID_votes[_proposalID];
         uint _totalWeight = _DAOVAULT.totalWeight() + _BONDVAULT.totalWeight(); // add BondVault totalWeight
        uint consensus = _totalWeight * majorityFactor / 10000; // >66.66%
        if(votes > consensus){
            return true;
        } else {
            return false;
        }
    }

    function hasQuorum(uint _proposalID) public view returns(bool){
        uint votes = mapPID_votes[_proposalID];
        uint _totalWeight = _DAOVAULT.totalWeight()  + _BONDVAULT.totalWeight(); // add BondVault totalWeight
        uint consensus = _totalWeight / 2; // >50%
        if(votes > consensus){
            return true;
        } else {
            return false;
        }
    }

    function hasMinority(uint _proposalID) public view returns(bool){
        uint votes = mapPID_votes[_proposalID];
         uint _totalWeight = _DAOVAULT.totalWeight()  + _BONDVAULT.totalWeight(); // add BondVault totalWeight
        uint consensus = _totalWeight / 6; // >16%
        if(votes > consensus){
            return true;
        } else {
            return false;
        }
    }

    //======================================PROTOCOL CONTRACTs GETTER=================================//
    function ROUTER() public view returns(iROUTER){
        if(daoHasMoved){
            return Dao(DAO).ROUTER();
        } else {
            return _ROUTER;
        }
    }

    function UTILS() public view returns(iUTILS){
        if(daoHasMoved){
            return Dao(DAO).UTILS();
        } else {
            return _UTILS;
        }
    }

    function BONDVAULT() public view returns(iBONDVAULT){
        if(daoHasMoved){
            return Dao(DAO).BONDVAULT();
        } else {
            return _BONDVAULT;
        }
    }

    function DAOVAULT() public view returns(iDAOVAULT){
        if(daoHasMoved){
            return Dao(DAO).DAOVAULT();
        } else {
            return _DAOVAULT;
        }
    }

    function POOLFACTORY() public view returns(iPOOLFACTORY){
        if(daoHasMoved){
            return Dao(DAO).POOLFACTORY();
        } else {
            return _POOLFACTORY;
        }
    }

    function SYNTHFACTORY() public view returns(iSYNTHFACTORY){
        if(daoHasMoved){
            return Dao(DAO).SYNTHFACTORY();
        } else {
            return _SYNTHFACTORY;
        }
    }

    function RESERVE() public view returns(iRESERVE){
        if(daoHasMoved){
            return Dao(DAO).RESERVE();
        } else {
            return _RESERVE;
        }
    }

    function SYNTHVAULT() public view returns(iSYNTHVAULT){
        if(daoHasMoved){
            return Dao(DAO).SYNTHVAULT();
        } else {
            return _SYNTHVAULT;
        }
    }

    //============================== HELPERS ================================//
    function memberCount() external view returns(uint){
        return arrayMembers.length;
    }

    function getProposalDetails(uint proposalID) external view returns (ProposalDetails memory proposalDetails){
        proposalDetails.id = proposalID;
        proposalDetails.proposalType = mapPID_type[proposalID];
        proposalDetails.votes = mapPID_votes[proposalID];
        proposalDetails.coolOffTime = mapPID_coolOffTime[proposalID];
        proposalDetails.finalising = mapPID_finalising[proposalID];
        proposalDetails.finalised = mapPID_finalised[proposalID];
        proposalDetails.param = mapPID_param[proposalID];
        proposalDetails.proposedAddress = mapPID_address[proposalID];
        proposalDetails.open = mapPID_open[proposalID];
        proposalDetails.startTime = mapPID_startTime[proposalID];
        return proposalDetails;
    }

    function assetListedCount() external view returns (uint256 count){
        return listedBondAssets.length;
    }

    function allListedAssets() external view returns (address[] memory _allListedAssets){
        return listedBondAssets;
    }
    
    function isEqual(bytes memory part1, bytes memory part2) private pure returns(bool){
        if(sha256(part1) == sha256(part2)){
            return true;
        } else {
            return false;
        }
    }
}


   