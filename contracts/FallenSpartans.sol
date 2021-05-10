pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;

import "./iBEP20.sol"; 
import "./iDAO.sol";
import "./iBASE.sol";

contract FallenSpartans {

    address public SPARTA;
    address public DEPLOYER;
    uint256 public totalSparta;
    uint256 public totalToClaim;
    uint256 public genesis;

    mapping(address => uint256) mapFallenSpartan_toClaim;

    modifier onlyDAO() {
        require(msg.sender == DEPLOYER );
        _;
    }
    constructor(address _sparta) {
        SPARTA = _sparta;
        DEPLOYER = msg.sender;
        totalToClaim = 20 * 10**6 *10**18;//20 million
    }

    function _DAO() internal view returns(iDAO) {
         return iBASE(SPARTA).DAO(); 
    }
    function setParams(uint _totalSparta) external onlyDAO {
        totalSparta = _totalSparta;
    }

    function allocate(address _fallenSpartan, uint256 _claim) external onlyDAO {
        uint claimAmount = (_claim * totalToClaim) / totalSparta;
        mapFallenSpartan_toClaim[_fallenSpartan] = claimAmount;
        //need to numbers to get this part
    }

    function claim() external {
       uint claimable = mapFallenSpartan_toClaim[msg.sender];
       mapFallenSpartan_toClaim[msg.sender] = 0;
       require(iBEP20(SPARTA).transfer(msg.sender, claimable));
    }

    function expire() external onlyDAO {
        require(block.timestamp >= genesis + 15552000);
        iBEP20(SPARTA).transfer(_DAO().DAO(),iBEP20(SPARTA).balanceOf(address(this)));
    }


}