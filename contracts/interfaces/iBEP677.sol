//iBEP20 Interface
pragma solidity 0.8.3;

interface iBEP677 {
 function receivedApproval(bytes calldata data) external;
}