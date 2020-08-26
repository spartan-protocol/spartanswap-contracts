# Spartan Swap - Incentivised Liquidity Powered By SPARTAN

Spartan Swap is a liquidity pool protocol that allows token-agnostic provision of liquidity. Traders can swap between tokens at arbitrarily low fees, but a liquidity-sensitive fee maximises revenue for stakers during periods of high demand. 

## Deploy
1) Deploy SPARTA
2) Deploy UTILS(SPARTA)
3) Deploy DAO(SPARTA, UTILS)
4) Set DAO in SPARTA
4) Deploy Router(SPARTA, UTILS)
5) Set Router in DAO

Sparta is the base currency.
Utils needs to know Router (to calculate state) and DAO (to ask for router)
DAO needs to know Utils (to calculate state)
Router needs to know Sparta, Utils, DAO (to tell Pools)
Pools needs to know DAO to ask for Router


0x4d523C380B76386c9e41D7F92456CcE6c712Db87 jp

1000000000000000000 // 10**18
1000000000000000000000000 //1m
0x0000000000000000000000000000000000000000

// Kovan
0x0C1d8c5911A1930ab68b3277D35f45eEd25e1F26 sparta
0xE4Ae305ebE1AbE663f261Bc00534067C80ad677C USDT
0x17218e58fdf07c989facca25de4c6fdb06502186 BUSD
0x3e2e792587ceb6c1090a8a42f3efcfad818d266d DAI

0x696a6B50d7FC6213a566fCC197acced4c4dDefa2 utils
0x75BCFf5dA17EdE9111dB0c3aA138351260c75FF3 dao
0x15967D09bc67A1aafFC43D88CcD4F6196df3B259 router



0x4d523C380B76386c9e41D7F92456CcE6c712Db87 jp

1000000000000000000 // 10**18
1000000000000000000000000 //1m
0x0000000000000000000000000000000000000000

// BSC

0x4c70e3Fb5D828f5f992B6aF9a49D13716F717cac Sparta
0x3E2e792587Ceb6c1090a8A42F3EFcFad818d266D Sparta-Minted
0x89C8da7569085D406800C473619d0c6B7AC0CE8E USD Coin
0x42E7A6e8e266d50d390c916c4715a5Fa01fd9522 BUsd

0x007EA5C0Ea75a8DF45D288a4debdD5bb633F9e56 utils
0x9cC299b2AdC9FE6C0cab8949c48Ccd8d2ba59ada Dao
0xCaF0366aF95E8A03E269E52DdB3DbB8a00295F91 Router

// BSC - 2

0xeD9E15523aA05Fa822dB42643682B9F8411310D3 Sparta
0x3E2e792587Ceb6c1090a8A42F3EFcFad818d266D Sparta-Minted
0x89C8da7569085D406800C473619d0c6B7AC0CE8E USD Coin
0x42E7A6e8e266d50d390c916c4715a5Fa01fd9522 BUsd

0xAfCe5dA566377D293a8e681cf2824f7Dc0C733C6 utils
0x862138A5c5b85E34D599cF60B99f67ABeFaaA99f Dao
0x4D419c4c8d65788523373523615271115A6B815B Router






https://explorer.binance.org/smart-testnet/address/0x3E2e792587Ceb6c1090a8A42F3EFcFad818d266D/transactions


## Smart Contract

Spartan Swap  has the following intended design:

Staking
* Stake any token into any pool
* Move capital between pools (unstake and stake in a single transaction)
* Withdraw partial or full capital from any pool to any token

Swapping
* Swap from any token to any token


### ERC-20

### SpartanSwap Public Get Methods
**WIP**

### SpartanSwap Public Transactions
**WIP**

### Core Math

```solidity

function  calcSwapOutput(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * Y * X)/(x + X)^2
        uint numerator = x.mul(Y.mul(X));
        uint denominator = (x.add(X)).mul(x.add(X));
        return numerator.div(denominator);
    }

    function  calcSwapFee(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * Y * x) / (x + X)^2
        uint numerator = x.mul(Y.mul(x));
        uint denominator = (x.add(X)).mul(x.add(X));
        return numerator.div(denominator);
    }

    function calcStakeUnits(uint a, uint A, uint v, uint V) public pure returns (uint units){
        // units = ((V + A) * (v * A + V * a))/(4 * V * A)
        // (part1 * (part2 + part3)) / part4
        uint part1 = V.add(A);
        uint part2 = v.mul(A);
        uint part3 = V.mul(a);
        uint numerator = part1.mul((part2.add(part3)));
        uint part4 = 4 * (V.mul(A));
        return numerator.div(part4);
    }

    function calcAsymmetricShare(uint s, uint T, uint A) public pure returns (uint share){
        // share = (s * A * (2 * T^2 - 2 * T * s + s^2))/T^3
        // (part1 * (part2 - part3 + part4)) / part5
        uint part1 = s.mul(A);
        uint part2 = T.mul(T).mul(2);
        uint part3 = T.mul(s).mul(2);
        uint part4 = s.mul(s);
        uint numerator = part1.mul(part2.sub(part3).add(part4));
        uint part5 = T.mul(T).mul(T);
        return numerator.div(part5);
    }
```

### Constructor
**WIP**


## Testing - Buidler

The test suite uses [Buidler](https://buidler.dev/) as the preferred testing suite, since it compiles and tests faster. 
The test suite implements 7 routines that can be tested individually.

```
npx buidler compile
```

Execute all at once:
```
npx builder test
```

Or execute individually:
```
npx builder test/1_coin.js
```



