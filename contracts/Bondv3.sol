// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

//iBEP20 Interface
interface iBEP20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint);
    function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
    function transfer(address, uint) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function approve(address, uint) external returns (bool);
    function transferFrom(address, address, uint) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
}
interface iBASE {
    function claim(address asset, uint256 amount) external payable;  
    function DAO() external view returns (address);
    function burn(uint) external;
}
interface iROUTER {
    function addLiquidity(uint inputBase, uint inputToken, address token) external payable returns (uint units);
}
interface iUTILS {
    function calcTokenPPinBase(address pool, uint256 amount) external view returns (uint256 value);
    function getPool(address token)external view returns (address value);
}
interface iDAO {
    function ROUTER() external view returns(address);
    function UTILS() external view returns(address);
    function depositForMember(address pool, uint256 amount, address member) external;
    function deposit(address pool, uint256 amount) external;
    function mapMember_weight(address member) external returns (uint256);
    function totalWeight() external returns (uint256);
}
interface iBONDv2{
    function calcClaimBondedLP(address member, address asset) external returns (uint256);
    function claim(address asset) external returns (bool);
}


library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;
        return c;
    }
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        return c;
    }
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }
}
    //======================================SPARTA=========================================//
contract BondV3 is iBEP20 {
    using SafeMath for uint256;

    // ERC-20 Parameters
    string public override name; string public override symbol;
    uint256 public override decimals; uint256 public override totalSupply;  

    // ERC-20 Mappings
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;


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
    struct ProposalDetails {
        uint id;
        string proposalType;
        uint votes;
        uint timeStart;
        bool finalising;
        bool finalised;
        uint param;
        address proposedAddress;
    }

  // Parameters
    address public BASE;
    address [] public arrayMembers;
    address public DEPLOYER;
    uint public one = 10**18;
    address [] listedBondAssets;
    uint256 baseSupply;
    uint256 public bondingPeriodSeconds = 31536000;
    uint256 private basisPoints = 10000;
    uint public proposalCount;
    uint256 public totalWeight;
    uint256 public coolOffPeriod;
    uint256 public majorityFactor = 2;
    uint256 public daoFee = 100*one;

    mapping(address => ListedAssets) public mapAddress_listedAssets;
    mapping(address => bool) public isListed;

    mapping(uint256 => string) public mapPID_type;
    mapping(uint256 => uint256) public mapPID_param;
    mapping(uint256 => uint256) public mapPID_votes;
    mapping(uint256 => uint256) public mapPID_timeStart;
    mapping(uint256 => bool) public mapPID_finalising;
    mapping(uint256 => bool) public mapPID_finalised;
    mapping(uint256 => address) public mapPID_address;
    mapping(uint256 => mapping(address => uint256)) public mapPIDMember_votes;
    

    event ListedAsset(address indexed DAO, address indexed asset);
    event DelistedAsset(address indexed DAO, address indexed asset);
    event DepositAsset(address indexed owner, uint256 indexed depositAmount, uint256 indexed bondedLP);
    event NewProposal(address indexed member, uint indexed proposalID, string proposalType);
    event NewVote(address indexed member, uint indexed proposalID, uint voteWeight, uint totalVotes, string proposalType);
    event ProposalFinalising(address indexed member,uint indexed proposalID, uint timeFinalised, string proposalType);
    event CancelProposal(address indexed member, uint indexed oldProposalID, uint oldVotes, uint newVotes, uint totalWeight);
    event FinalisedProposal(address indexed member,uint indexed proposalID, uint votesCast, uint totalWeight, string proposalType);
    modifier onlyDeployer() {
        require(msg.sender == DEPLOYER, "Must be DAO");
        _;
    }

    //=====================================CREATION=========================================//
    // Constructor
    constructor(address _base) public {
        BASE = _base;
        name = "SpartanBondTokenV3";
        symbol  = "SPT-BOND-V3";
        decimals = 18;
        coolOffPeriod = 259200;
        DEPLOYER = msg.sender;
        totalSupply = 1 * (10 ** 18);
        _balances[address(this)] = totalSupply;
        emit Transfer(address(0), address(this), totalSupply);

    }
    function _DAO() internal view returns(address) {
        return iBASE(BASE).DAO();
    }
    function purgeDeployer() public onlyDeployer {
        DEPLOYER = address(0);
    }

    //========================================iBEP20=========================================//
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
    // iBEP20 Transfer function
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }
    // iBEP20 Approve, change allowance functions
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].add(addedValue));
        return true;
    }
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender].sub(subtractedValue, "iBEP20: decreased allowance below zero"));
        return true;
    }
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "iBEP20: approve from the zero address");
        require(spender != address(0), "iBEP20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    // iBEP20 TransferFrom function
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount, "iBEP20: transfer amount exceeds allowance"));
        return true;
    }

    // TransferTo function
    function transferTo(address recipient, uint256 amount) public returns (bool) {
        _transfer(tx.origin, recipient, amount);
        return true;
    }

    // Internal transfer function
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "iBEP20: transfer from the zero address");
        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }
    // Internal mint 
    function _mint(address _account, uint256 _amount) internal virtual {
        require(_account != address(0), "iBEP20: mint to the zero address");
        totalSupply = totalSupply.add(_amount);
        _balances[_account] = _balances[_account].add(_amount);
        emit Transfer(address(0), _account, _amount);
    }

    //====================================DEPLOYER================================//
    function listBondAsset(address asset) public onlyDeployer returns (bool){
         if(!isListed[asset]){
            isListed[asset] = true;
            listedBondAssets.push(asset);
        }
        emit ListedAsset(msg.sender, asset);
        return true;
    }
    function changeBondingPeriod(uint256 bondingSeconds) public onlyDeployer returns (bool){
        bondingPeriodSeconds = bondingSeconds;
        return true;
    }
    function burnBalance() public onlyDeployer {
        uint256 baseBal = iBEP20(BASE).balanceOf(address(this));
        iBASE(BASE).burn(baseBal);
    }
    function mintBond() public onlyDeployer returns (bool) {
        uint256 amount =1*10**18;
        _mint(address(this), amount);
       return true;
    }
    function changeMajorityFactor(uint256 majority) public onlyDeployer returns (bool){
        majorityFactor = majority;
        return true;
    }
    function changeDAOFee(uint256 fee) public onlyDeployer returns (bool){
        daoFee = fee;
        return true;
    }
    function changeCoolOff(uint256 coolOff) public onlyDeployer returns (bool){
        coolOffPeriod = coolOff;
        return true;
    }
    
     //================================ BOND Feature ==================================//
    function burnBond() public returns (bool success){
        require(totalSupply > 0, 'burnt already');
        _approve(address(this), BASE, totalSupply);
        iBASE(BASE).claim(address(this), totalSupply);
        totalSupply = totalSupply.sub(totalSupply);
        baseSupply = iBEP20(BASE).balanceOf(address(this));
        iBEP20(BASE).approve(iDAO(_DAO()).ROUTER(), baseSupply);
        return true;
    }
    function deposit(address asset, uint256 amount) public payable returns (bool success) {
        require(amount > 0, 'must get asset');
        require(isListed[asset], 'must be listed');
        uint256 liquidityUnits = handleTransferIn(asset, amount);
        if(!mapAddress_listedAssets[asset].isMember[msg.sender]){
          mapAddress_listedAssets[asset].isMember[msg.sender] = true;
          arrayMembers.push(msg.sender);
          mapAddress_listedAssets[asset].members.push(msg.sender);
        }
        mapAddress_listedAssets[asset].bondedLP[msg.sender] = mapAddress_listedAssets[asset].bondedLP[msg.sender].add(liquidityUnits);
        mapAddress_listedAssets[asset].lastBlockTime[msg.sender] = now;
        mapAddress_listedAssets[asset].claimRate[msg.sender] = mapAddress_listedAssets[asset].bondedLP[msg.sender].div(bondingPeriodSeconds);
        emit DepositAsset(msg.sender, amount, liquidityUnits);
        return true;
    }
    function handleTransferIn(address _token, uint _amount) internal returns (uint LPunits){
        uint256 spartaAllocation = iUTILS(iDAO(_DAO()).UTILS()).calcTokenPPinBase(_token, _amount);
        if(_token == address(0)){
                require((_amount == msg.value), "InputErr");
                LPunits = iROUTER(iDAO(_DAO()).ROUTER()).addLiquidity{value:_amount}(spartaAllocation, _amount, _token);
            } else {
                iBEP20(_token).transferFrom(msg.sender, address(this), _amount);
                if(iBEP20(_token).allowance(address(this), iDAO(_DAO()).ROUTER()) < _amount){
                    uint256 approvalTNK = iBEP20(_token).totalSupply();  
                    iBEP20(_token).approve(iDAO(_DAO()).ROUTER(), approvalTNK);  
                }
                LPunits = iROUTER(iDAO(_DAO()).ROUTER()).addLiquidity(spartaAllocation, _amount, _token);
            }
    }
    function claimAndLock(address asset) public returns (bool){
          claimAndLockForMember(asset, msg.sender);
    }
    function claimAndLockForMember(address asset, address member) public returns (bool){
        require(mapAddress_listedAssets[asset].bondedLP[member] > 0, 'must have bonded lps');
        require(mapAddress_listedAssets[asset].isMember[member], 'must have deposited first');
        uint256 claimable = calcClaimBondedLP(member, asset); 
        address _pool = iUTILS(iDAO(_DAO()).UTILS()).getPool(asset);
        require(claimable <= mapAddress_listedAssets[asset].bondedLP[member],'attempted to overclaim');
        mapAddress_listedAssets[asset].lastBlockTime[member] = now;
        mapAddress_listedAssets[asset].bondedLP[member] = mapAddress_listedAssets[asset].bondedLP[member].sub(claimable);
        iBEP20(_pool).transfer(member, claimable); // send LPs to user
        uint256 lpBalance =  iBEP20(_pool).balanceOf(member); // get user LP balance incase of bondv2 claim
        iDAO(_DAO()).depositForMember(_pool, lpBalance, member); //send lp tokens to DAO for lock
        return true;
    }
    function calcClaimBondedLP(address bondedMember, address asset) public returns (uint){
        require(isListed[asset], 'asset must be listed');
        uint256 secondsSinceClaim = now.sub(mapAddress_listedAssets[asset].lastBlockTime[bondedMember]); // Get time since last claim
        uint256 rate = mapAddress_listedAssets[asset].claimRate[bondedMember];
        uint claimAmount;
        if(secondsSinceClaim >= bondingPeriodSeconds){
            mapAddress_listedAssets[asset].claimRate[bondedMember] = 0;
            claimAmount = mapAddress_listedAssets[asset].bondedLP[bondedMember];
        }else {
            claimAmount = secondsSinceClaim.mul(rate);
        }
        return claimAmount;
    }

    //============================ DAO PROPOSALS ===================================//
    // New ID, but specify type, one type for each function call
    // Votes counted to IDs
    // IDs are finalised
    // IDs are executed, but type specifies unique logic
    function newAddressProposal(address proposedAddress, string memory typeStr) public returns(uint) {
        require(iBEP20(BASE).transferFrom(msg.sender, _DAO(), daoFee), 'Fee For DAO');
        proposalCount += 1;
        mapPID_address[proposalCount] = proposedAddress;
        mapPID_type[proposalCount] = typeStr;
        emit NewProposal(msg.sender, proposalCount, typeStr);
        return proposalCount;
    }
    function newActionProposal(string memory typeStr) public returns(uint) {
        require(iBEP20(BASE).transferFrom(msg.sender, _DAO(), daoFee), 'Fee For DAO');
        proposalCount += 1;
        mapPID_type[proposalCount] = typeStr;
        emit NewProposal(msg.sender, proposalCount, typeStr);
        return proposalCount;
    }
    function completeProposal(uint _proposalID) internal {
        string memory _typeStr = mapPID_type[_proposalID];
        emit FinalisedProposal(msg.sender, _proposalID, mapPID_votes[_proposalID], totalWeight, _typeStr);
        mapPID_votes[_proposalID] = 0;
        mapPID_finalised[_proposalID] = true;
        mapPID_finalising[_proposalID] = false;
    }
   
//============================== VOTE && FINALISE ================================//

    function voteProposal(uint proposalID) public returns (uint voteWeight) {
        bytes memory _type = bytes(mapPID_type[proposalID]);
        voteWeight = countVotes(proposalID);
        totalWeight = iDAO(_DAO()).totalWeight();
        if(hasMajority(proposalID) && mapPID_finalising[proposalID] == false){
                _finalise(proposalID);
        }
        emit NewVote(msg.sender, proposalID, voteWeight, mapPID_votes[proposalID], string(_type));
    }
    function _finalise(uint _proposalID) internal {
        bytes memory _type = bytes(mapPID_type[_proposalID]);
        mapPID_finalising[_proposalID] = true;
        mapPID_timeStart[_proposalID] = now;
        emit ProposalFinalising(msg.sender, _proposalID, now+coolOffPeriod, string(_type));
    }
    function cancelProposal(uint oldProposalID, uint newProposalID) public {
        require(mapPID_finalising[oldProposalID], "Must be finalising");
        require(hasMinority(newProposalID), "Must have minority");
        require(isEqual(bytes(mapPID_type[oldProposalID]), bytes(mapPID_type[newProposalID])), "Must be same");
        mapPID_votes[oldProposalID] = 0;
        emit CancelProposal(msg.sender, oldProposalID, mapPID_votes[oldProposalID], mapPID_votes[newProposalID], totalWeight);
    }
    function finaliseProposal(uint proposalID) public  {
        require((now.sub(mapPID_timeStart[proposalID])) > coolOffPeriod, "Must be after cool off");
        require(mapPID_finalising[proposalID] == true, "Must be finalising");
        if(!hasMajority(proposalID)){
            mapPID_finalising[proposalID] = false;
        }
        bytes memory _type = bytes(mapPID_type[proposalID]);
        if (isEqual(_type, 'LIST')){
            _listBondAsset(proposalID);
        } else if (isEqual(_type, 'DELIST')){
            _delistBondAsset(proposalID);
        } else if (isEqual(_type, 'COOL_OFF')){
            _changeCooloff(proposalID);
        }else if (isEqual(_type, 'MINT')){
            _mintBond(proposalID);
        }
    }

     //=========================== DAO functions ================================//
    function _mintBond(uint _proposalID) internal {
        require(iBEP20(BASE).balanceOf(address(this)) <= 10*one, "Must not mint if sparta already available");
        require(totalSupply <= 0, 'BOND asset already available for burn');
        uint256 amount = 1*one;
        _mint(address(this), amount);
        completeProposal(_proposalID);
    }
    function _changeCooloff(uint _proposalID) internal {
        uint _proposedParam = mapPID_param[_proposalID];
        require(_proposedParam != 0, "No param proposed");
        coolOffPeriod = _proposedParam;
        completeProposal(_proposalID);
    }
    function _listBondAsset(uint _proposalID) internal {
         address _proposedAddress = mapPID_address[_proposalID];
        if(!isListed[_proposedAddress]){
            isListed[_proposedAddress] = true;
            listedBondAssets.push(_proposedAddress);
        }
        emit ListedAsset(msg.sender, _proposedAddress);
        completeProposal(_proposalID);
    }
    function _delistBondAsset(uint _proposalID) internal {
        address _proposedAddress = mapPID_address[_proposalID];
        require(_proposedAddress != address(0), "No address proposed");
            isListed[_proposedAddress] = false;
        emit DelistedAsset(msg.sender, _proposedAddress);
        completeProposal(_proposalID);
    }
    

    //============================== CONSENSUS ================================//

    function countVotes(uint _proposalID) internal returns (uint voteWeight){
        mapPID_votes[_proposalID] = mapPID_votes[_proposalID].sub(mapPIDMember_votes[_proposalID][msg.sender]);
        voteWeight = iDAO(_DAO()).mapMember_weight(msg.sender);
        mapPID_votes[_proposalID] += voteWeight;
        mapPIDMember_votes[_proposalID][msg.sender] = voteWeight;
        return voteWeight;
    }
    function hasMajority(uint _proposalID) public view returns(bool){
        uint votes = mapPID_votes[_proposalID];
        uint consensus = totalWeight.div(majorityFactor); 
        if(votes > consensus){
            return true;
        } else {
            return false;
        }
    }
    function hasMinority(uint _proposalID) public view returns(bool){
        uint votes = mapPID_votes[_proposalID];
        uint consensus = totalWeight.div(6); // >16%
        if(votes > consensus){
            return true;
        } else {
            return false;
        }
    }
    function isEqual(bytes memory part1, bytes memory part2) public pure returns(bool){
        if(sha256(part1) == sha256(part2)){
            return true;
        } else {
            return false;
        }
    }
    

    //============================== HELPERS ================================//
    function assetListedCount() public view returns (uint256 count){
        return listedBondAssets.length;
    }
    function allListedAssets() public view returns (address[] memory _allListedAssets){
        return listedBondAssets;
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