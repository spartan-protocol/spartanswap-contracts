
// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./interfaces/iBEP20.sol";
import "./interfaces/iDAO.sol";
import "./interfaces/iBASE.sol";
import "./interfaces/iUTILS.sol";
import "./interfaces/iBEP677.sol"; 
    //======================================SPARTA=========================================//
contract Sparta is iBEP20 {

    // ERC-20 Parameters
    string public constant override name = 'SPARTAN PROTOCOL TOKEN';
    string public constant override symbol = 'SPARTA';
    uint8 public constant override decimals = 18;
    uint256 public override totalSupply;

    // ERC-20 Mappings
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Parameters
    bool public emitting;
    bool public minting;
    uint256 public feeOnTransfer;
    
    uint256 public emissionCurve;
    uint256 public _100m;
    uint256 public maxSupply;

    uint256 public secondsPerEra;
    uint256 public currentEra;
    uint256 public nextEraTime;

    address public DAO;
    address public DEPLOYER;
    address public BASEv1;

    event NewEra(uint256 currentEra, uint256 nextEraTime, uint256 emission);

    // Only DAO can execute
    modifier onlyDAO() {
        require(msg.sender == DAO || msg.sender == DEPLOYER, "Must be DAO");
        _;
    }

    //=====================================CREATION=========================================//
    // Constructor
    constructor(address _fallenSpartans, address _baseV1) public {
        _100m = 100 * 10**6 * 10**decimals; // 100m
        maxSupply = 300 * 10**6 * 10**decimals; // 300m
        emissionCurve = 2048;
        emitting = false;
        minting = false;
        currentEra = 1;
        BASEv1 = _baseV1;
        secondsPerEra = 86400;
        nextEraTime = block.timestamp + secondsPerEra;
        DEPLOYER = msg.sender;
        _mint(_fallenSpartans, 10 * 10**5 * 10*decimals);
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
        _approve(msg.sender, spender, _allowances[msg.sender][spender]+(addedValue));
        return true;
    }
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        _approve(msg.sender, spender, _allowances[msg.sender][spender]-(subtractedValue));
        return true;
    }
     function _approve( address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "sender");
        require(spender != address(0), "spender");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    // iBEP20 TransferFrom function
     function transferFrom( address sender, address recipient, uint256 amount) external virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        // Unlimited approval (saves an SSTORE)
        if (_allowances[sender][msg.sender] < type(uint256).max) {
            _approve(sender, msg.sender, _allowances[sender][msg.sender] - amount);
        }
        return true;
    }

    //iBEP677 approveAndCall
    function approveAndCall(address recipient, uint amount, bytes calldata data) public returns (bool) {
      bool success = approve(recipient, amount);
       if (success){
        iBEP677(recipient).onTokenTransfer(msg.sender, amount, data);
      }
      return success;
     }

    // Internal transfer function
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "iBEP20: transfer from the zero address");
        require(recipient != address(this), "recipient");
        _balances[sender] -= amount;
        uint _fee = iUTILS(UTILS()).calcPart(feeOnTransfer, amount);   // Critical functionality                                                      
        if(_fee <= amount){                // Stops reverts if UTILS corrupted           
            amount -= _fee;
            _burn(msg.sender, _fee);
        }
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
        _checkEmission();
    }

    // Internal mint (upgrading and daily emissions)
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "iBEP20: mint to the zero address");
        totalSupply += amount;
        require(totalSupply <= maxSupply, "Must not mint more than the cap");
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }
    // Burn supply
    function burn(uint256 amount) public virtual {
        _burn(msg.sender, amount);
    }
    function burnFrom(address account, uint256 amount) public virtual {  
        uint256 decreasedAllowance = allowance(account, msg.sender) - (amount);
        _approve(account, msg.sender, decreasedAllowance);
        _burn(account, amount);
    }
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "iBEP20: burn from the zero address");
        _balances[account] -= amount;
        totalSupply -= amount;
        emit Transfer(account, address(0), amount);
    }


    //=========================================DAO=========================================//
    // Can start
    function flipEmissions() public onlyDAO {
        emitting = !emitting;
    }
     // Can stop
    function flipMinting() external onlyDAO {
        minting = !minting;
    }
    // Can set params
    function setParams(uint256 newEra, uint256 newCurve, uint256 _feeBP) external onlyDAO {
        secondsPerEra = newEra;
        emissionCurve = newCurve;
        feeBP = _feeBP;
    }
    // Can change DAO
    function changeDAO(address newDAO) external onlyDAO {
        require(newDAO != address(0), "address err");
        DAO = newDAO;
    }
    // Can purge DAO
    function purgeDAO() external onlyDAO {
        DAO = address(0);
    }
    // Can purge DEPLOYER
    function purgeDeployer() public onlyDAO returns(bool){
        DEPLOYER = address(0);
        return true;
    }

   //======================================EMISSION========================================//
    // Internal - Update emission function
    function _checkEmission() private {
        if ((block.timestamp >= nextEraTime) && emitting) {    // If new Era and allowed to emit                      
            currentEra += 1; // Increment Era
            nextEraTime = block.timestamp + secondsPerEra; // Set next Era time
            uint256 _emission = getDailyEmission(); // Get Daily Dmission
            _mint(RESERVE(), _emission); // Mint to the RESERVE Address
            feeOnTransfer = iUTILS(UTILS()).getFeeOnTransfer(totalSupply, maxSupply); 
            if (feeOnTransfer > 1000) {
                feeOnTransfer = 1000;
            } 
            emit NewEra(currentEra, nextEraTime, _emission); // Emit Event
        }
    }
    // Calculate Daily Emission
    function getDailyEmission() public view returns (uint256) {
        uint _adjustedCap;
        if(totalSupply <= _100m){ // If less than 100m, then adjust cap down
            _adjustedCap = (maxSupply * totalSupply)/(_100m); // 300m * 50m / 100m = 300m * 50% = 150m
        } else {
            _adjustedCap = maxSupply;  // 300m
        }
        return (_adjustedCap - totalSupply) / (emissionCurve); // outstanding / 2048 
    }

    //==========================================Minting============================================//
    function upgrade(uint256 amount) external {
        require(iBASE(BASEv1).transferTo(address(this), amount)); 
        require(iBASE(BASEv1).burn(amount));
        _mint(msg.sender, amount); // 1:1
    }

    function daoMint(uint256 amount, address recipient) external onlyDAO {
        require(amount <= 5 * 10**6 * 10**decimals, '!5m'); //5m at a time
        if(minting && (totalSupply <= _100m)){
             _mint(recipient, amount); 
        }
    }

    //======================================HELPERS========================================//
    // Helper Functions
    function UTILS() internal view returns(address){
        return iDAO(DAO).UTILS();
    }
    function RESERVE() internal view returns(address){
        return iDAO(DAO).RESERVE(); 
    }

}