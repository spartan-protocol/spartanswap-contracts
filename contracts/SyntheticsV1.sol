// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./IContracts.sol";

contract Synth is iBEP20 {
    using SafeMath for uint256;
    address public BASE;
    uint256 public one = 10**18;

    // ERC-20 Parameters
    string _name; string _symbol;
    uint256 public override decimals; uint256 public override totalSupply;
    // ERC-20 Mappings
    mapping(address => uint) private _balances;
    mapping(address => mapping(address => uint)) private _allowances;

    mapping(address => uint) public totalLPCollateral;

    event AddLPCollateral(address member, uint inputLPToken, uint synthsIssued);

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    constructor (address _token) public payable {
        string memory synthName = "SpartanSynthV1-";
        string memory synthSymbol = "SSTV1-";
        _name = string(abi.encodePacked(synthName, iBEP20(_token).name()));
        _symbol = string(abi.encodePacked(synthSymbol, iBEP20(_token).symbol()));
        decimals = 18;
     
    }

    //========================================iBEP20=========================================//
    function name() public view override returns (string memory) {
        return _name;
    }
    function symbol() public view override returns (string memory) {
        return _symbol;
    }
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }
    // iBEP20 Transfer function
    function transfer(address to, uint256 value) public override returns (bool success) {
        _transfer(msg.sender, to, value);
        return true;
    }
    // iBEP20 Approve function
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    // iBEP20 TransferFrom function
    function transferFrom(address from, address to, uint256 value) public override returns (bool success) {
        require(value <= _allowances[from][msg.sender], 'AllowanceErr');
        _allowances[from][msg.sender] = _allowances[from][msg.sender].sub(value);
        _transfer(from, to, value);
        return true;
    }
    // Internal transfer function
    function _transfer(address _from, address _to, uint256 _value) private {
        require(_balances[_from] >= _value, 'BalanceErr');
        require(_balances[_to] + _value >= _balances[_to], 'BalanceErr');
        _balances[_from] -= _value;
        _balances[_to] += _value;
        emit Transfer(_from, _to, _value);
    }
    // Contract can mint
    function _mint(address account, uint256 amount) internal {
        totalSupply = totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }
    // Burn supply
    function burn(uint256 amount) public virtual {
        _burn(msg.sender, amount);
    }
    function burnFrom(address from, uint256 value) public virtual override {
        require(value <= _allowances[from][msg.sender], 'AllowanceErr');
        _allowances[from][msg.sender] -= value;
        _burn(from, value);
    }
    function _burn(address account, uint256 amount) internal virtual {
        _balances[account] = _balances[account].sub(amount, "BalanceErr");
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }
    // TransferTo function
    function transferTo(address recipient, uint256 amount) public returns (bool) {
                _transfer(tx.origin, recipient, amount);
        return true;
    }


    function swapSynth()public payable returns(uint256 outputAmount, uint256 fee){

    }
    // Add collateral for self
    function addCollateral(address lpToken) public returns(uint synths){
        synths = addCollateralForMember(lpToken, msg.sender);
        return synths;
    }
    function _getAddedCollateralAmount(address _lptoken) internal view returns(uint256 _actual){
        uint _lpCollateralBalance = iBEP20(_lptoken).balanceOf(address(this)); 
        uint _totalLPCollateral = totalLPCollateral[_lptoken];
        if(_lpCollateralBalance > _totalLPCollateral){
            _actual = _lpCollateralBalance.sub(_totalLPCollateral);
        } else {
            _actual = 0;
        }
        return _actual;
    }
    // add collateral for member
    function addCollateralForMember(address lptoken, address member) public returns(uint synths){
        uint256 _actualInputCollateral = _getAddedCollateralAmount(lptoken);
        uint _baseAmount = iPOOL(lptoken).baseAmount();
        uint _lpTotalSupply = iPOOL(lptoken).baseAmount();
        uint baseValue = _DAO().UTILS().calcAsymmetricShare(_actualInputCollateral, _baseAmount, _lpTotalSupply);
         synths = _DAO().UTILS().calcBasePPinTokenWithPool(lptoken, baseValue);
         _mint(member, synths);
         emit AddLPCollateral(member, _actualInputCollateral, synths);
        return synths;
    }


}

contract synthRouter {

    using SafeMath for uint256;
    address public BASE;
    address public DEPLOYER;
    iROUTER private _ROUTER;
    iUTILS private _UTILS;

    uint public totalCollateral;
    uint public totalDebt;
    uint public addCollateralTx;

    address[] public arraySynths;


    mapping(address=>address) private mapToken_Synth;
    mapping(address=>bool) public isSynth;


    event NewSynth(address token, address pool, uint genesis);
    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER, "Must be DAO");
        _;
    }

    constructor () public payable {
        DEPLOYER = msg.sender;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }
    function setGenesisAddresses(address _router, address _utils) public onlyDAO {
        _ROUTER = iROUTER(_router);
        _UTILS = iUTILS(_utils);
    }

    receive() external payable {}

    // In case of new synthRouter can migrate metrics
    function migrateSynthRouterData(address payable oldSynthRouter) public onlyDAO {
 
    }

    function migrateSynthTokenData(address payable oldSynthRouter) public onlyDAO {

    }

    function purgeDeployer() public onlyDAO {
        DEPLOYER = address(0);
    }
    
    function createSynth(address lpToken, address token, uint256 inputLPToken) public returns(address synth){
        require(getSynth(token) == address(0), "CreateErr");
        require(lpToken != BASE, "Must not be Base");
        require((inputLPToken > 0), "Must get token");
        require(ROUTER().isCuratedPool(lpToken) == true, "Must be Curated");
        Synth newSynth; 
        newSynth = new Synth(token); 
        synth = address(newSynth);
        uint actualInputCollateral = _handleTransferIn(lpToken, inputLPToken, synth);
        totalCollateral = totalCollateral.add(actualInputCollateral);
        mapToken_Synth[token] = synth;
        arraySynths.push(synth); 
        isSynth[synth] = true;
        addCollateralTx += 1;
        Synth(synth).addCollateralForMember(msg.sender);
        emit NewSynth(token, synth, now);
        return synth;
        }

    // Add collateral for self
    function addCollateral(uint inputLPToken, address lpToken, address synth) public payable returns (uint synths) {
        synths = addCollateralForMember(inputLPToken, lpToken, msg.sender, synth);
        return synths;
    }

    // Add collateral for member
    function addCollateralForMember(uint inputLPToken, address lpToken, address member, address synth) public payable returns (uint synthetics) {
        require(isSynth[synth], "Synth must exist");
        require(ROUTER().isCuratedPool(lpToken) == true, "Must be Curated");
        uint _actualInputCollateral = _handleTransferIn(lpToken, inputLPToken, synth);
        totalCollateral = totalCollateral.add(_actualInputCollateral);
        addCollateralTx += 1;
        synthetics = Synth(synth).addCollateralForMember(member);
        return synthetics;
    }

    function _handleTransferIn(address _lptoken, uint256 _amount, address _synth) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_lptoken).balanceOf(_synth); 
                iBEP20(_lptoken).transferFrom(msg.sender, _synth, _amount); 
                actual = iBEP20(_lptoken).balanceOf(_synth).sub(startBal);
        }
    }

    function _handleTransferOut(address _token, uint256 _amount, address _recipient) internal {
        if(_amount > 0) {
            iBEP20(_token).transfer(_recipient, _amount);
            
        }
    }
   
    function ROUTER() public view returns(iROUTER){
        return iROUTER(_DAO().ROUTER());
    }

    function UTILS() public view returns(iUTILS){
        return iUTILS(_DAO().UTILS());
    }
    function getSynth(address token) public view returns(address synth){
        return mapToken_Synth[token];
    }


 

    //==================================================================================//
    // Swapping Functions
    
    //=================================onlyDAO=====================================//


    //======================================HELPERS========================================//
 
}