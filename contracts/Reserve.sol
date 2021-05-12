// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iBEP20.sol";
import "./iBASE.sol";
import "./iDAO.sol";

contract Reserve {
    address public BASE;
    address public DEPLOYER;
    bool public emissions;

    modifier onlyGrantor() {
        require(msg.sender == DEPLOYER, "!DAO");
        _; 
    }

    constructor (address _base ) {
        BASE = _base;
        DEPLOYER = msg.sender;
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
}