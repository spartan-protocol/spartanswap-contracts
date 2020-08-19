// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

interface iERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint);
    function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
}

interface iSPARTA {
    function mapAddressHasClaimed() external view returns (bool);
}
contract Utils {

    struct TokenDetails {
        string name;
        string symbol;
        uint decimals;
        uint totalSupply;
        uint balance;
        address tokenAddress;
    }

    struct ListedAssetDetails {
        string name;
        string symbol;
        uint decimals;
        uint totalSupply;
        uint balance;
        address tokenAddress;
        bool hasClaimed;
    }

    function getTokenDetails(address token) public view returns (TokenDetails memory tokenDetails){
        tokenDetails.name = iERC20(token).name();
        tokenDetails.symbol = iERC20(token).symbol();
        tokenDetails.decimals = iERC20(token).decimals();
        tokenDetails.totalSupply = iERC20(token).totalSupply();
        tokenDetails.tokenAddress = token;
        return tokenDetails;
    }

    function getTokenDetailsWithBalance(address token, address member) public view returns (TokenDetails memory tokenDetails){
        tokenDetails.name = iERC20(token).name();
        tokenDetails.symbol = iERC20(token).symbol();
        tokenDetails.decimals = iERC20(token).decimals();
        tokenDetails.totalSupply = iERC20(token).totalSupply();
        tokenDetails.balance = iERC20(token).balanceOf(member);
        tokenDetails.tokenAddress = token;
        return tokenDetails;
    }

    function getUnclaimedAssetWithBalance(address token, address member) public view returns (ListedAssetDetails memory listedAssetDetails){
        listedAssetDetails.name = iERC20(token).name();
        listedAssetDetails.symbol = iERC20(token).symbol();
        listedAssetDetails.decimals = iERC20(token).decimals();
        listedAssetDetails.totalSupply = iERC20(token).totalSupply();
        listedAssetDetails.balance = iERC20(token).balanceOf(member);
        listedAssetDetails.tokenAddress = token;
        listedAssetDetails.hasClaimed = iSPARTA(member).mapAddressHasClaimed();
        return listedAssetDetails;
    }

}