// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBEP20.sol";
import "./iBASE.sol";
import "./iDAO.sol";
import "./TransferHelper.sol";
import "./iROUTER.sol";
import "./iPOOLFACTORY.sol";  
import "./iLEND.sol";  
import "./iLENDVAULT.sol";  


contract Reserve {
    address public immutable BASE;  // Address of SPARTA base token contract
    address public DEPLOYER;        // Address that deployed the contract | can be purged to address(0)
    bool public emissions;          // Is SPARTA emitting from RESERVE -> incentive addresses
    bool public globalFreeze;       // Is there a global pause in place
    uint256 public freezeTime;
    uint256 public polEmission;
    bool public polStatus;
    uint256 public polTime;
    uint256 public polClaim;

    // Restrict access
    modifier onlyGrantor() {
        require(msg.sender == _DAO().DAO() || msg.sender == _DAO().ROUTER() || msg.sender == _DAO().SYNTHVAULT() || msg.sender == DEPLOYER || msg.sender == _DAO().LEND(), "!DAO"); 
        _; 
    }
    modifier onlyDAO() {
         require(msg.sender == _DAO().DAO() || msg.sender == DEPLOYER ); 
        _; 
    }

    constructor (address _base) {
        BASE = _base;
        DEPLOYER = msg.sender;
        polTime = 86400;
        polEmission = block.timestamp + 86400;
        polClaim = 0;
    }

    function setpParams(uint256 newPolTime, uint256 newpolClaim) external onlyDAO {
        polTime = newPolTime;
        polClaim = newpolClaim;
    }

    function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
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
                uint256 polAmount = (iBEP20(BASE).balanceOf(address(this)) * polClaim) / 10000; //get amount using balance of reserve
                addPOL(polAmount, to);
            }
        }
    }


    function flipEmissions() external onlyGrantor {
        emissions = !emissions; // Flip emissions on/off
    }

    function addPOL(uint256 _polAmount, address _to) internal {
         if((block.timestamp > polEmission) && polStatus){
             if(iPOOLFACTORY(_DAO().POOLFACTORY()).isCuratedPool(_to)){
                 iROUTER(_DAO().ROUTER()).addLiquidityAsym(_polAmount, true, _to);
                 if(iBEP20(_to).allowance(address(this), iLEND(_DAO().LEND()).LendVault()) < 0){
                     iBEP20(_to).approve(iLEND(_DAO().LEND()).LendVault(), 1000000000000000000000000000);//approve a large amount 1,000,000,000
                 }
                 iLENDVAULT(iLEND(_DAO().LEND()).LendVault()).lendLP(_to, iBEP20(_to).balanceOf(address(this)));
                 polEmission += polTime; //update emission
               }
        }
    }
    function migratePOl(address newReserve, address newLendVault) external onlyDAO {

    }

    function performApprovals() external onlyDAO(){
        iBEP20(BASE).approve(_DAO().ROUTER(), 300000000000000000000000000);//entire supply called once
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