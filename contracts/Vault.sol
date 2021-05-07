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
            console.log("deposit");
        }
        (bool status,) = address(this).delegatecall(_data);
        
        require(status, "Forwarded call failed.");
          
    }

     function deposit(address token, uint256 amount, address member) public returns (bool) {

       iBEP20(token).transferFrom(member, address(this), amount); 

        return true;
    }
    

    function addFM(uint inputBase, uint inputToken, address token, address member) public returns (bool) {
         
       iBEP20(token).transferFrom(member, address(this), inputToken); 
       iBEP20(BASE).transferFrom(member, address(this), inputBase); 

        return true;
    }

    function bytesToString(bytes memory hw) public pure returns(string memory){
        string memory converted = string(hw);
        return converted;
    }
    function stringToBytes(string memory s) public pure returns (bytes memory){
        bytes memory b3 = bytes(s);
        return b3;
    }

    function isEqual(bytes memory part1, bytes memory part2) public pure returns(bool){
        if(sha256(part1) == sha256(part2)){
            return true;
        } else {
            return false;
        }
    }
    function toUint256(bytes memory _bytes)  internal pure returns (uint256 value) {
    assembly {
      value := mload(add(_bytes, 0x20))
    }



}

}