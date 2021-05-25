// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBEP20.sol";
import "./iBASE.sol";
import "./iDAO.sol";

contract Reserve {
    address public BASE;
    address public ROUTER;
    address public LEND;
    address public DAO;
    address public SYNTHVAULT;
    address public DEPLOYER;
    bool public emissions;

    // Only DAO can execute
    modifier onlyGrantor() {
        require(msg.sender == DAO || msg.sender == ROUTER || msg.sender == DEPLOYER || msg.sender == LEND || msg.sender == SYNTHVAULT, "Must be DAO");
        _; 
    }

    constructor (address _base ) {
        BASE = _base;
        DEPLOYER = msg.sender;
    }

     function setIncentiveAddresses(address _router,address _lend,address _synthVault, address _Dao) external onlyGrantor {
        ROUTER = _router;
        LEND = _lend;
        SYNTHVAULT = _synthVault;
        DAO = _Dao;
    }

    function grantFunds(uint amount, address to) external onlyGrantor {
        uint reserve = iBEP20(BASE).balanceOf(address(this));
        if(amount > 0){
           if(emissions){
            if(amount > reserve){
               iBEP20(BASE).transfer(to, reserve);
            }else{
                iBEP20(BASE).transfer(to, amount);
            }
        }
        }
    }

    function flipEmissions() external onlyGrantor {
        emissions = !emissions; 
    }
    // Can purge DEPLOYER
    function purgeDeployer() external onlyGrantor {
        DEPLOYER = address(0);
    }
}