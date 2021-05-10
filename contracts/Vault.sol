// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import './iBEP677.sol';
import "./iBEP20.sol";

contract TestVault {


    address public BASE;
    address public DEPLOYER;

constructor(address _base) {
        BASE = _base;
        DEPLOYER = msg.sender; 
    }

    function onTokenApproval(address token, uint amount, address member, bytes calldata data) external virtual returns (bool){
        // bytes4 sig = data[0] | (bytes4(data[1]) >> 8) | (bytes4(data[2]) >> 16) | (bytes4(data[3]) >> 24);
        // if (sig == bytes4(keccak256("deposit(address,uint256,address, address)"))) {
        //     (,,,address token2) = abi.decode(data[4:], (address, uint256, address, address));
        //     require(token2 != address(0), "Address of owner cannot be zero.");
        //     console.log("add");
        // }
        // (bool status,) = address(this).delegatecall(data);
        
        // require(status, "Delegate call failed.");

        if(isEqual(data, stringToBytes("DEPOSIT"))){
             deposit(token, amount, member);
        // }else if(isEqual(data, stringToBytes("ADD"))) {
        //     //  add(inputBase, amount, token, from);
        }else{
            (address _token2,uint _amount2) = abi.decode(data,(address,uint));
            
            add(token, amount, _token2, _amount2, member);

            // console.log("didn't work");
       
        }
          
    }

     function deposit(address token, uint256 amount, address member) public returns (bool) {

       iBEP20(token).transferFrom(member, address(this), amount); 

        return true;
    }

    function add(address token, uint256 amount, address token2, uint amount2, address member) public returns (bool) {

        iBEP20(token).transferFrom(member, address(this), amount); 
        iBEP20(token2).transferFrom(member, address(this), amount2); 

        return true;
    }
    




    function bytesToString(bytes memory hw) public pure returns(string memory){
        return string(hw);
    }
    function stringToBytes(string memory s) public pure returns (bytes memory){
        return bytes(s);
    }

    function isEqual(bytes memory part1, bytes memory part2) public pure returns(bool equal){
        if(sha256(part1) == sha256(part2)){
            return true;
        }
    }
    function toUint256(bytes memory _bytes)  internal pure returns (uint256 value) {
        assembly {
            value := mload(add(_bytes, 0x20))
        }
    }

}