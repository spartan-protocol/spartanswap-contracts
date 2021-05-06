// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iBEP20.sol";
interface iBASE {
    function DAO() external view returns (iDAO);
    function transferTo(address, uint256 ) external payable returns(bool);
}
interface iDAO {
    function DAO() external view returns (address);
}

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

    constructor (address _base ) public {
        BASE = _base;
        DEPLOYER = msg.sender;
    }

    function setIncentiveAddresses(address _router,address _lend,address _synthVault, address _newDao) external onlyGrantor {
        ROUTER = _router;
        LEND = _lend;
        SYNTHVAULT = _synthVault;
        DAO = _newDao;
    }

    function grantFunds(uint amount, address to) external onlyGrantor returns (bool){
        uint reserve = iBEP20(BASE).balanceOf(address(this));
        if(amount > 0){
           if(emissions){
            if(amount > reserve){
               iBEP20(BASE).transfer(to, reserve);
            }else{
                iBEP20(BASE).transfer(to, amount);
            }
          return true;
        }
        }
    }

    function start() external onlyGrantor {
        emissions = true;
    }
    function stop() external onlyGrantor {
        emissions = false;
    }
 
   

}