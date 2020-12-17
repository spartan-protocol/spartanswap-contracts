pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./IContracts.sol";
import "./DaoVault.sol";

contract DaoVault {
    address public BASE;

     constructor (address _base) public payable {
        BASE = _base;
    }

modifier onlyDAO() {
        require(msg.sender == _DAO().DAO());
        _;
    }

function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

    // Contract deposits LP tokens for member
    function deposit(address pool, uint256 amount) public onlyDAO {
        require(iPOOL(pool).transferTo(address(this), amount),"Must transfer"); // LP tokens return bool
    }
    // Contract withdraws LP tokens for member
     function withdraw(address pool, uint amount) public onlyDAO {
        require(iBEP20(pool).transfer(tx.origin, amount), "Must transfer"); // Then transfer
    }

}
