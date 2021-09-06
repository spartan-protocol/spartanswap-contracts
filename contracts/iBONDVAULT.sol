// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.3;
interface iBONDVAULT{
  function depositForMember(address asset, address member, uint liquidityUnits) external;
  function claimForMember(address listedAsset, address member) external;
  function calcBondedLP(address bondedMember, address asset) external view returns(uint);
  function getMemberPoolBalance(address, address) external view returns (uint256);
  function totalWeight() external view returns (uint);
  function isListed(address) external view returns (bool);
  function listBondAsset(address) external;
  function delistBondAsset(address) external;
  function claim(address, address) external;
  function getMemberLPWeight( address) external view returns(uint, uint);
  function mapTotalPool_balance(address) external view returns (uint);
}