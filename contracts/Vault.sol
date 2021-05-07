// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import './interfaces/iBEP677.sol';
import "./interfaces/iBEP20.sol";
import "@nomiclabs/buidler/console.sol";

contract TestVault {



 address public BASE;
    address public DEPLOYER;

constructor(address _base) {
        BASE = _base;
        DEPLOYER = msg.sender; 
    }

    function receivedApproval(bytes calldata _data) external virtual returns (bool){
        bytes4 sig = _data[0] | (bytes4(_data[1]) >> 8) | (bytes4(_data[2]) >> 16) | (bytes4(_data[3]) >> 24);
        if (sig == bytes4(keccak256("deposit(address,uint256,address)"))) {
            (address token,,) = abi.decode(_data[4:], (address, uint256, address));
            require(token != address(0), "Address of owner cannot be zero.");
        }
        (bool status,) = address(this).delegatecall(_data);
        
        require(status, "Forwarded call failed.");
          
    }

     function deposit(address token, uint256 amount, address member) public returns (bool) {
       iBEP20(token).transferFrom(member, address(this), amount); 
        return true;
    }
   
}

}