// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
import "./iDAO.sol";
interface iBASE {
    function DAO() external view returns (iDAO);
    function secondsPerEra() external view returns (uint256);
    function changeDAO(address) external returns(bool);
    function changeEmissionCurve(uint256) external returns(bool);
    function changeEraDuration(uint256) external returns(bool);
    function flipEmissions() external returns(bool);
}