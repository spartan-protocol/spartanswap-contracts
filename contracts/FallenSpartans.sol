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

    event SpartanAllocated(address indexed spartanAddress, uint256 amount);

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

    function allocate(address [] memory _fallenSpartan, uint256 [] memory _claim) external onlyDAO {
        for(uint i = 0; i<_fallenSpartan.length; i++){
              mapFallenSpartan_toClaim[_fallenSpartan[i]] = _claim[i];
             emit SpartanAllocated(_fallenSpartan[i],_claim[i]);
        }
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