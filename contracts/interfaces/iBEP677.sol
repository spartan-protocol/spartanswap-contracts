//iBEP20 Interface
pragma solidity 0.8.3;

interface iBEP677 {
function onTokenTransfer(address from, uint256 amount, bytes calldata data) external;
}