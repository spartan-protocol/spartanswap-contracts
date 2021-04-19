// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./synth.sol";  

contract SynthVault { 
    address public BASE;
    address public DEPLOYER;
    address public NDAO;

    constructor (address _base, address _newDAO) public {
        BASE = _base;
        NDAO = _newDAO;
        DEPLOYER = msg.sender; 
    }

    function _DAO() internal view returns(iDAO) {
        bool status = iDAO(NDAO).MSTATUS();
        if(status == true){
         return iBASE(BASE).DAO();
        }else{
          return iNDAO(NDAO).DAO();
        }
    }

   // deposit synths external
   // harvest rewards external
   // calc rewards internal
   // Buy synths internal
   // helpers for memberRewards


}