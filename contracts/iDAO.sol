// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iDAO {
    function ROUTER() external view returns(address);
    function DAOVAULT() external view returns(address);
    function BASE() external view returns(address);
    function LEND() external view returns(address);
    function UTILS() external view returns(address);
    function DAO() external view returns (address);
    function RESERVE() external view returns(address);
    function SYNTHVAULT() external view returns(address);
    function BONDVAULT() external view returns(address);
    function SYNTHFACTORY() external view returns(address);
    function POOLFACTORY() external view returns(address);
    function depositForMember(address pool, uint256 amount, address member) external;
    function currentProposal() external view returns (uint);
    function mapPID_open(uint) external view returns (bool);
    function isListed(address) external view returns (bool);
    function arrayMembers(uint) external view returns (address);
    function mapMember_lastTime(address) external view returns (uint);
}