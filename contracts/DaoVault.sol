pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;
import "@nomiclabs/buidler/console.sol";
import "./cInterfaces.sol"; 
interface iDAO {
     function DAO() external view returns (address);
}
interface iBASE {
    function secondsPerEra() external view returns (uint256);
    function DAO() external view returns (iDAO);
    function changeIncentiveAddress(address) external returns(bool);
    function changeDAO(address) external returns(bool);
    function changeEmissionCurve(uint256) external returns(bool);
    function changeEraDuration(uint256) external returns(bool);
    function startEmissions() external returns(bool);
    function stopEmissions() external returns(bool);
    function transferTo(address, uint256) external payable returns(bool);
}
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

    // Contract withdraws LP tokens for member
function withdraw(address pool, uint amount, address member) public onlyDAO returns (bool){
        require(iBEP20(pool).transfer(member, amount), "Must transfer"); // Then transfer
        return true;
}

}
