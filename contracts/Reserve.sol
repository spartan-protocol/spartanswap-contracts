// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBEP20.sol";
import "./iBASE.sol";
import "./iDAO.sol";
import "./TransferHelper.sol";
import "./iPOOLFACTORY.sol";  
import "./iROUTER.sol";

contract Reserve {
    address public immutable BASE;  // Address of SPARTA base token contract
    address public DEPLOYER;        // Address that deployed the contract | can be purged to address(0)
    bool public emissions;          // Is SPARTA emitting from RESERVE -> incentive addresses
    bool public globalFreeze;       // Is there a global pause in place
    uint256 public freezeTime;
    address public polTokenAddress;
    address public polPoolAddress;
    uint256 public polEmission;
    uint256 public polTime;
    bool public polStatus;
    uint256 public polClaim;
    

    // Restrict access
    modifier onlyGrantor() {
        require(msg.sender == _DAO().DAO() || msg.sender == _DAO().ROUTER() || msg.sender == _DAO().SYNTHVAULT() || msg.sender == DEPLOYER || msg.sender == _DAO().LEND(), "!DAO"); 
        _; 
    }
    modifier onlyDAO() {
        require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER);
        _;
    }

    constructor (address _base) {
        BASE = _base;
        DEPLOYER = msg.sender;
        polTime = block.timestamp;
        polEmission = 3600;
        polClaim = 50;//100 bp 
        polStatus = false;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    function setParams(address token) external onlyDAO (){
        address _polPoolAddress = iPOOLFACTORY(_DAO().POOLFACTORY()).getPool(token);
        require(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_polPoolAddress) == true);
        polTokenAddress = token;
        polPoolAddress = _polPoolAddress;
    }

    function setPOLParams(uint256 newPolEmission, uint256 newpolClaim) external onlyDAO {
        polEmission = newPolEmission;
        polClaim = newpolClaim;
    }

    // Send SPARTA to an incentive address (Vault harvest, dividends etc)
    function grantFunds(uint amount, address to) external onlyGrantor {
        uint reserve = iBEP20(BASE).balanceOf(address(this)); // Get RESERVE's SPARTA balance
        if(amount > 0){ // Skip if amount is not valid
            if(emissions){ // Skip if emissions are off
                if(amount > reserve){
                    TransferHelper.safeTransfer( BASE, to, reserve);
                } else {
                    TransferHelper.safeTransfer(BASE, to, amount);
                }
                addPOL();
            }
        }
    }

    // Send POL to an incentive address
    function grantPOLFunds(uint amount, address to) external onlyDAO {
        uint reserve = iBEP20(polPoolAddress).balanceOf(address(this)); // Get RESERVE's POL balance
        if(amount > 0){ // Skip if amount is not valid
            if(emissions){ // Skip if emissions are off
                if(amount > reserve){
                    TransferHelper.safeTransfer(polPoolAddress, to, reserve);
                } else {
                    TransferHelper.safeTransfer(polPoolAddress, to, amount);
                }
            }
        }
    }


    function flipEmissions() external onlyGrantor {
        emissions = !emissions; // Flip emissions on/off
    }
    function flipPol() external onlyGrantor {
        polStatus = !polStatus; // Flip emissions on/off
    }
    
    function performApprovals() external onlyDAO(){
        iBEP20(BASE).approve(_DAO().ROUTER(), 300000000000000000000000000);//entire supply called once
    }

    function addPOL() internal {
     uint256 polAmount = (iBEP20(BASE).balanceOf(address(this)) * polClaim) / 10000; //get amount using balance of reserve
         if((block.timestamp > polTime) && polStatus){ 
              iROUTER(_DAO().ROUTER()).addLiquidityAsym(polAmount, true, polTokenAddress); 
              polTime = block.timestamp + polEmission;
        }
    }

    function setGlobalFreeze(bool freeze) external onlyGrantor {
        globalFreeze = freeze;
        if(freeze){
            freezeTime = block.timestamp;
        }else{
            freezeTime = 0;
        }
        emissions = !freeze;
    }
   
    // Can purge deployer once DAO is stable and final
    function purgeDeployer() external onlyGrantor {
        DEPLOYER = address(0);
    }
}