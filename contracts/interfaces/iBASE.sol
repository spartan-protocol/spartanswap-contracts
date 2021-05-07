pragma solidity 0.8.3;
pragma experimental ABIEncoderV2;
import "./iDAO.sol";
interface iBASE {
    function DAO() external view returns (iDAO);
    function burn(uint) external;
    function secondsPerEra() external view returns (uint256);
    function changeDAO(address) external returns(bool);
    function changeEmissionCurve(uint256) external returns(bool);
    function changeEraDuration(uint256) external returns(bool);
    function flipEmissions() external returns(bool);
}