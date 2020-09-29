# Spartan Protocol - Incentivised Liquidity Powered By SPARTAN

Spartan Protocol is a liquidity pool protocol that allows token-agnostic provision of liquidity. Traders can swap between tokens at arbitrarily low fees, but a liquidity-sensitive fee maximises revenue for liquidity providers during periods of high demand. 

The Spartan Protocol can also facilitate the following features:
* Synthetic Token Generation using liquidity pool shares
* Lending markets using a flexible peg-out of low-use pool capital
* Derivatives by winding up synthetic token generation in multiple runs

## Architecture

The following contracts manage the protocol:

1) `BASE` Contract (Sparta Token Contract)
2) `DAO` Contract (Manages Governance)
3) `UTILS` Contract (Stateless contract that manages core math and helper functions)
4) `ROUTER` Contract (Manages how liquidity is moved around the system)
5) `POOL` Contract (Holds funds and state for each pool)

`BASE` is the source-of-truth for the location of the `DAO`, as well as minting and distributing incentives. 

DAO is the source-of-truth for the location of the `ROUTER` and `UTILS`, as well as distributing rewards and managing how the system upgrades itself. It has goverance features that use a member's claim on `BASE` in each pool to attribute voting weight. The `DAO` can upgrade itself, as well as amending some features in the `BASE` contract.

`UTILS` contains utility and math functions, and can be upgraded by the `DAO`. 

`ROUTER` contains state and business logic for moving funds, and can be upgraded by the DAO. Users interact with the `ROUTER`.

`POOL` holds the funds for each pool, as well as state. It asks the `DAO` for the location of `UTILS` which has core math relating to how swaps and liquidity is provisioned, such as calculating fees.  

## Addresses

BASE - 0xE4Ae305ebE1AbE663f261Bc00534067C80ad677C
UTILS - 0xCaF0366aF95E8A03E269E52DdB3DbB8a00295F91
DAO - 0x04e283c9350Bab8A1243ccfc1dd9BF1Ab72dF4f0
ROUTER - 0xAfCe5dA566377D293a8e681cf2824f7Dc0C733C6

WBNB - 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c

## Deploy Process

The contracts are to be deployed and then connected together. The DEPLOYER (EOA) has initial `DAO` privileges in order to manage the process. DEPLOYER should be purged when the system is stable. 

1) Deploy `SPARTA`
2) Deploy `UTILS(sparta.address)`
3) Deploy `DAO(sparta.address)`
4) Deploy `ROUTER(sparta.address, wbnb.address)`
5) Set `dao.address` in SPARTA
6) Set `router.address, utils.address` in `DAO`

* SPARTA is the `BASE` currency.
* `UTILS` needs to know SPARTA (to ask for `DAO`)
* `DAO` needs to know SPARTA (to manage), `ROUTER` and `UTILS`
* `ROUTER` needs to know SPARTA to ask for `DAO`, to ask for `UTILS`
* `POOL` needs to know `DAO` to ask for `UTILS`

## Upgrade Process

Goverance should pass a proposal electing a new address. 

### UTILS
Once passed, the `DAO` will know the new `UTILS` contract, and return it when queried (by the `ROUTER`).

**Critical - the new `UTILS` contract must be inspected for malicious code before allowing an upgrade.**

### ROUTER
Once passed, the `DAO` will know the new `ROUTER` contract, and return it when queried.

Since the `ROUTER` holds state, the new `ROUTER` may or may not need state migrated in from the old `ROUTER`. The state includes:
* array of tokens listed (registry - critical)
* metrics for the protocol (read-only - not critical)

The new Router may instead want to query the old router for the registry, in addition to managing its own. 

### DAO
Once passed, the `DAO` will tell the `BASE` contract of the new `DAO`. `POOL` will now know, because it asks `BASE` for the location. 

### Incentive Address
This address receives emissions from `BASE`. The `DAO` can set a new incentive address. 


## Governance

Members firstly lock SPARTAN liquidity tokens, which allow a claim on `BASE` in each pool to be detected and summed. Importantly, goverance is on-market and liquid - whilst locking another member can purchase `BASE` off existing members and lock. This reduces existing member weight. 

Proposals are a 3-step process:

1) Create a proposal with parameters
2) Vote for that proposal, if passing quorum, then proceed into a cool-off period in "finalising" state
3) Once finalising, and past cool-off, anyone can call and finalise in order to effect the proposal on the system.

### Thresholds

* Majority: 50%
* Quorum: 33%
* Minority: 16.5%

### Safety

Proposals that upgrade critical infrastructure require Majority, (all others require Quorum):
* Upgrade `DAO`
* Upgrade `UTILS`
* Upgrade Incentive Address

During the Cool-Off period, a competing proposal that has Minority vote-weight, can call in and veto a finalising Quorum proposal. A scenario is as follows:

1) A questionable Proposal to grant a large holder some funds, gets past 33% vote and enters cool-off.
2) Minority (16.5%) members are concerned it is not in the best interest of the system, so thus have 7 days to vote for a competing proposal that can be used to neutralise (1). 
3) The competing proposal is not effected, it also needs to achieve Quorum first. 

### DAO
* Change `DAO`
* Change `ROUTER`
* Change `UTILS`
* Change Incentive Address
* List new asset (not past 100m emitted, less than 10m allocation)
* Delist existing asset
* Change Emission Curve
* Change Era Duration
* Start Emissions
* Stop Emissions
* Change Cool-off Period length
* Change erasToEarn (how fast the incentives pay out)

## Incentive Design

The `BASE` contract mints a certain number of coins every era and sends them to the Incentive Address, which can also be the `DAO`. 

The mint amount is set by `(300m-totalSupply)/emissionCurve` which will mint a slowly decreasing amount each day. In future, a burn feature can reduce total supply, thereby stabilising emissions. 

Users lock LP tokens in the `DAO` and can call `harvest()` as often as they want, although since the reserve in the `DAO` depletes, it favours those who call it more frequently. If the `erasToEarn` is set to 30 days, then after the final drop, it will take 30 days for all rewards to be consumed. However, since new rewards are sent there every day, the velocity of emissions should be fairly constant. 

## Router Design

The `ROUTER` facilitates funds movement from users into pools, containing business logic for creating pools, adding/removing liquidity, and swapping. It wraps the underlying `POOL` contract. Token to Token swaps can only be done via the Router. 

The Router does not hold funds. 

* The `ROUTER` also tracks metrics, which can in future be used to distribute rewards in a more novel way, such as based on volume or average fees earned, per pool. 
* The `ROUTER` handles BNB by converting it into WrappedBNB first. 
* The `ROUTER` deploys a new `POOL` contract each time a new `POOL` is created, and maintains a registry of listed tokens. 

## Pool Design

The pool contains logic and holds funds and state. The only way to get funds out of the `POOL` is to send it funds first (assets or liquidity tokens).

* Liquidity is added by sending the `POOL` funds, then calling `addLiquidity()`. It will find all spare funds on its address and attribute that to the liquidity provider, calling `mint()`.
* Liquidity is removed by sending liquidity tokens to the `POOL` then calling `removeLiquidity()`. It will find all spare tokens on its address, burn them, then send the liquidity provider their fair share of funds. 
* A Swap is executed by sending the `POOL` funds, then calling `swap(token)`. It finds all spare funds on its address, and calculates the swap output in the other token, then sending that out. 
* A `sync()` function is added that re-syncs the recorded token amounts on the `POOL` address.

**The pool asks the `UTILS` contract for logic relating to adding/removing liquidity, as well as swapping, so in future different logic could be added. However an upgrade to a malicous `UTILS` contract could compromise funds in the system.** 

## Utils Design

Utils works as both a web3 aggregrator (one call that makes several EVM calls, returning objects), as well as the core arithmetic of the system. 

It is also used to retrieve state from the router, tokens and pools. DApps should read from Utils, write to Router. 

The `UTILS` contract has the following:

* Aggregrating token details
* Aggregrating sparta burn details
* Getting all tokens and pools in the system
* Getting pool data
* Arithmetic relating to pools and members
* Core math relating to calculating swaps and liquidity provisioning

**The `UTILS` contract can be upgraded, but upgrading it to a malicious contract can compromise funds in the system by changing logic to favour an attacker.**


## Future Features

Factory
* Use a separate Factory Contract that deploys synths and pools

Router
* 1 SPARTA fee - not implemented yet
* Fee-based dividend - not implemented yet
* Synths - not implemented yet
* Lending - not implemented yet

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
npx builder test/1_base.js
```



