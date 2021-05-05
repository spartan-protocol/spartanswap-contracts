
//iBEP20 Interface
pragma solidity 0.8.3;

interface iDAO {
    function ROUTER() external view returns(address);
    function BASE() external view returns(address);
    function UTILS() external view returns(address);
    function DAO() external view returns (address);
    function RESERVE() external view returns(address);
}