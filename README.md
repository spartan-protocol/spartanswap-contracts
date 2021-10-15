# Spartan Protocol - Incentivised Liquidity Powered By SPARTA

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
6) `SYNTH` Contract (Holds Lps and state for each synthetic)
7) `SYNTHFACTORY` Contract (Creates a synthetic token from curated Pools)
8) `POOLFACTORY` Contract (Creates a pool)
9) `SYNTHVAULT` Contract (Holds funds and state for members)
10) `DAOVAULT` Contract (Holds funds and state for members)
11) `RESERVE` Contract (Holds emissions from base, grants funds to grantors)
12) `BONDVAULT` Contract (Holds LP funds and state for bond members)

`BASE` is the source-of-truth for the location of the `DAO`, as well as minting and distributing incentives. 

DAO is the source-of-truth for the location of the `ROUTER`, `UTILS`,`DAOVAULT`,`POOLFACTORY`,`SYNTHFACTORY`, `RESERVE` as well as distributing rewards and managing how the system upgrades itself. It has goverance features that use a member's claim on `BASE` in each pool to attribute voting weight. The `DAO` can upgrade itself, as well as amending some features in the `BASE` contract.

`UTILS` contains utility and math functions, and can be upgraded by the `DAO`. 

`ROUTER` contains state and business logic for moving funds, and can be upgraded by the DAO. Users interact with the `ROUTER`.

`POOL` holds the funds for each pool, as well as state. It asks the `DAO` for the location of `UTILS` which has core math relating to how swaps and liquidity is provisioned, such as calculating fees.  

## Addresses
WBNB - 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c

## Deploy Process

The contracts are to be deployed and then connected together. The DEPLOYER (EOA) has initial `DAO` privileges in order to manage the process. DEPLOYER should be purged when the system is stable. 

1) Deploy `SPARTA`
2) Deploy `SYNTHVAULT(SPARTA.address, Dao.address)`
3) Deploy `UTILS(SPARTA.address, Dao.address)`
4) Deploy `ROUTER(SPARTA.address, wbnb.address, Dao.address)`
5) Deploy `DAOVAULT(SPARTA.address, Dao.address)`
6) Deploy `BONDVAULT(SPARTA.address, Dao.address)`
8) Deploy `POOLFACTORY(SPARTA.address,  wbnb.address, Dao.address)`
9) Deploy `SYNTHFACTORY(SPARTA.address,  wbnb.address, Dao.address)`
10) Deploy `RESERVE(SPARTA.address)`
11) Set `(router.address, utils.address, daoVault.address, poolFactory.address, synthFactory.address, SPReserve.address)` in `DAO`
12) Set `dao.address` in `SPARTA`
13) Set  `(router.address, utils.address, synthV.address, Dao.address)` in `RESERVE`
14) Call `start()` in `RESERVE`


* SPARTA is the `BASE` currency.
* `UTILS` needs to know SPARTA (to ask for `DAO`)
* `DAO` needs to know SPARTA (to manage), along with `ROUTER` and `UTILS`
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

### RESERVE
This address receives emissions from `BASE`. The `DAO` can set a `RESERVE` address. 

## BondVault Design

The `BONDVAULT` holds state and LP tokens for all members who perform a `bond()` via the `DAO`. Contains logic for calculating member weights and claimable LP tokens. 

## DAO Design - Governance

Members firstly lock Spartan Protocol liquidity tokens in the `DAOVault`, which allow a claim on `BASE` in each pool to be detected and summed. Importantly, goverance is on-market and liquid - whilst locking another member can purchase `BASE` off existing members and lock. This reduces existing member weight. 

Proposals are a 3-step process:

1) Create a proposal with parameters.
2) Vote for that proposal, if passing quorum, then proceed into a cool-off period in "finalising" state.
3) Once finalising, and past cool-off, anyone can call and finalise in order to automate the actions of the proposal on the system.

### DAO Design - Thresholds

* Majority: 66.6%
* Quorum: 50%
* Minority: 16.6%

### DAO Design - Safety

Proposals that upgrade critical infrastructure require Majority:
* Upgrade `DAO` contract
* Upgrade `UTILS` contract
* Upgrade `RESERVE` contract
* Upgrade `ROUTER` contract
* Propose `GET_SPARTA` bond allocation
* Propose `GRANT` issue grant
* Propose `LIST_BOND` list bondable asset
* Propose `ADD_CURATED_POOL` enable curated asset

All other proposals require Quorum:
* Propose `FLIP_EMISSIONS` SPARTA emissions from `BASE`
* Propose `COOL_OFF` proposals cooloff on `DAO`
* Propose `ERAS_TO_EARN` eras to earn on `DAO`
* Propose `DELIST_BOND` delist bondable asset
* Propose `REMOVE_CURATED_POOL` disable curated asset

During the Cool-Off period, a competing proposal that has Minority vote-weight, can call in and veto a finalising Quorum proposal. A scenario is as follows:

1) A questionable Proposal to grant a large holder some funds, gets past 50% vote and enters cool-off.
2) Minority (16.6%) members are concerned it is not in the best interest of the system, so thus have the cool-off period to vote for a competing proposal that can be used to neutralise (1). 
3) The competing proposal is not finalised/completed, as it also needs to achieve Quorum first.

### DAO Design - Functionality
* Change `DAO`
* Change `ROUTER`
* Change `UTILS`
* Change `RESERVE`
* Enable/disable emission on `BASE`
* Change Cool-off period length
* Change erasToEarn (how fast the incentives pay out)
* Give out a SPARTA grant to an address
* Enable an allocation of SPARTA for `Bond` (Held in `DAO`)
* List a new `BOND` enabled asset
* Delist a `BOND` enabled asset
* Add an existing pooled-asset to the 'curated' list
* Remove an existing pooled-asset from the 'curated' list

## DaoVault Design

The `DAOVAULT` holds state and LP tokens for all members who perform a `deposit()` via the `DAO`. Contains logic for calculating member weights. 

## Pool Design

Each `POOL` contains logic and holds funds and state. The only way to get funds out of the `POOL` is to send it funds first (assets or liquidity tokens).

* Liquidity is added by sending the `POOL` funds, then calling `add()`. It will find all spare funds on its address and attribute that to the liquidity provider, calling `mint()`.
* Liquidity is removed by sending liquidity tokens to the `POOL` then calling `remove()`. It will find all spare tokens on its address, burn them, then send the liquidity provider their fair share of funds. 
* A Swap is executed by sending the `POOL` funds, then calling `swap(token)`. It finds all spare funds on its address, and calculates the swap output in the other token, then sending that out. 
* A `sync()` function is added that re-syncs the recorded token amounts on the `POOL` address.

**The pool asks the `UTILS` contract for logic relating to adding/removing liquidity, as well as swapping, so in the future, logic can be changed. However an upgrade to a malicous `UTILS` contract could compromise funds in the system.** 

## PoolFactory Design

The `POOLFACTORY` manages the creation and status of all Spartan pools. 

* Create a pool
* Add a pool to 'curated'
* Remove a pool from 'curated'
* Helper functions relating to pool counts / lists

## Reserve Design

The `BASE` contract mints a certain number of coins every era and sends them to the `RESERVE`.

The mint amount is set by `(300m-totalSupply)/emissionCurve` which will mint a slowly decreasing amount each day. The feeBurn in `BASE` enforces a deflationary burn to counter the emissions that gradually increases as the supply increases to counter the emissions.

Users lock LP tokens in the `DAO` and can call `harvest()` as often as they want, although since the reserve in the `DAO` depletes, it favours those who call it more frequently. If the `erasToEarn` is set to 30 days, then after the final drop, it will take 30 days for all rewards to be consumed. However, since new rewards are sent there every day, the velocity of emissions should be fairly constant. 

## Router Design

The `ROUTER` facilitates movement of funds from users into pools, containing business logic for adding/removing liquidity, swapping and managing synths.

The Router does not hold funds. 

* The `ROUTER` also tracks metrics, such as fee-based revenue. 
* The `ROUTER` handles BNB by converting it into WrappedBNB first, and unwrapping when returning to the user.

## Synth Design

Each `SYNTH` contains logic and holds LP tokens and state. Minting synths requires the relevant `POOL` to send LP units to the `SYNTH` and call `mintSynth()`. 

* Synths are created by sending the `SYNTH` LP tokens, then calling `mintSynth()`. It will mint the relevant requested amount of synths and attribute that to the user, via `mint()`.
* Synths are swapped back to layer 1 assets via `POOL` function: `burnSynth()` by sending synth tokens to the `SYNTH` then calling `burnSynth()`. It will find all spare synth tokens on its address, burn them, then send the LP tokens back to the pool to also be burnt and attribute the user their fair share of the requested BEP20 asset. 
* A `realise()` function burns excess LP tokens to ensure the revenue is going to the liquidity providers in the underlying pools instead of the un-owned LP tokens held on at `SYNTH`

## SynthFactory Design

The `SYNTHFACTORY` manages the creation and status of all Spartan synth assets. 

* Create a synth
* Helper functions relating to synth counts / lists

## Utils Design

`UTILS` works as both a web3 aggregrator (one call that makes several EVM calls, returning objects), as well as the core arithmetic of the system. 

It is also used to retrieve state from the router, tokens and pools. DApps can read from `UTILS`, write to `ROUTER`. 

The `UTILS` contract has the following:

* Getting all pools and their details
* Arithmetic relating to pools and members
* Core math relating to calculating swaps, synths and liquidity provisioning

**The `UTILS` contract can be upgraded, but upgrading it to a malicious contract can compromise funds in the system by changing logic to favour an attacker.**


## Future Features

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
