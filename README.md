# Spartan Swap - Incentivised Liquidity Powered By SPARTAN

Spartan Swap is a liquidity pool protocol that allows asset-agnostic provision of liquidity. Traders can swap between assets at arbitrarily low fees, but a liquidity-sensitive fee maximises revenue for stakers during periods of high demand. 

## Smart Contract

Spartan Swap  has the following intended design:

Staking
* Stake any asset into any pool
* Move capital between pools (unstake and stake in a single transaction)
* Withdraw partial or full capital from any pool to any asset

Swapping
* Swap from any asset to any asset


1000000000000000000 // 10**18
1000000000000000000000000 //1m
0x0000000000000000000000000000000000000000

0xE4Ae305ebE1AbE663f261Bc00534067C80ad677C token1
0x17218e58Fdf07c989faCca25De4c6FdB06502186 math
0x3E2e792587Ceb6c1090a8A42F3EFcFad818d266D Spartan
0xe6af83978de108ca71f43551a9f1e795d9edd546 SFactory












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



