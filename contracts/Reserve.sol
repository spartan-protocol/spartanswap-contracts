// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBEP20.sol";
import "./iBASE.sol";
import "./iDAO.sol";
import "hardhat/console.sol";
contract Reserve {
    address public immutable BASE;  // Address of SPARTA base token contract
    address public DEPLOYER;        // Address that deployed the contract | can be purged to address(0)
    bool public emissions;          // Is SPARTA emitting from RESERVE -> incentive addresses
    bool public globalFreeze;       // Is there a global pause in place
    uint256 public freezeTime;

    // Restrict access
    modifier onlyGrantor() {
        require(msg.sender == _DAO().DAO() || msg.sender == _DAO().ROUTER() || msg.sender == _DAO().SYNTHVAULT() || msg.sender == DEPLOYER || msg.sender == _DAO().LEND(), "!DAO"); 
        _; 
    }

    constructor (address _base) {
        require(_base != address(0), '!ZERO');
        BASE = _base;
        DEPLOYER = msg.sender;
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
                    require(iBEP20(BASE).transfer(to, reserve), '!transfer'); // Send remainder
                } else {
                    require(iBEP20(BASE).transfer(to, amount), '!transfer'); // Send requested amount
                }
            }
        }
    }

    function flipEmissions() external onlyGrantor {
        emissions = !emissions; // Flip emissions on/off
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