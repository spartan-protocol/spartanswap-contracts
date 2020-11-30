
const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');
const { expect } = require("chai");

var BASE = artifacts.require("./Base.sol");
var DAO = artifacts.require("./Dao.sol");
var ROUTER = artifacts.require("./Router.sol");
var POOL = artifacts.require("./Pool.sol");
var UTILS = artifacts.require("./Utils.sol");
var TOKEN1 = artifacts.require("./Token1.sol");
var BOND = artifacts.require("./BondV1.sol");
var BONDv3 = artifacts.require("./BondV3.sol");
var RECC = artifacts.require("./Recover.sol");
var WBNB = artifacts.require("./WBNB");
var base;
var utils; var router; var Dao;

var acc0; var acc1; var acc2; var acc3; var poolTKN1;
var start;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

contract('LOCK', function (accounts) {
    constructor(accounts)
    burnLock()
    deployerListTKN()
    depositTKN()
 

})

//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        base = await BASE.new()
        wbnb = await WBNB.new()
        utils = await UTILS.new(base.address)
        Dao = await DAO.new(base.address)
        router = await ROUTER.new(base.address, wbnb.address)
        lock = await BOND.new(base.address, router.address)
        bondd = await BONDv3.new(base.address)
        rec = await RECC.new(base.address)
        token1 = await TOKEN1.new();
      
        await base.listAsset(lock.address, _.BN2Str(4998957 * _.one),_.BN2Str(_.one) ) // list lock
       // await base.listAsset(lock.address, _.BN2Str(5000000 * _.one),_.BN2Str(_.one) ) // list lock
        await base.listAsset(token1.address, _.BN2Str(20 * _.one),_.BN2Str(_.one) ) //list token 1
      
        await base.changeDAO(Dao.address)
        await Dao.setGenesisAddresses(router.address, utils.address)

        let supply = await token1.totalSupply()

        await token1.transfer(acc2, _.getBN(_.BN2Int(supply))) // give acc1 token1 to burn
        await token1.approve(base.address, supply, {from:acc2})//approve base to burn token1 from acc1
        
        await base.claim(token1.address, _.BN2Str(_.one), {from: acc2}) // burn 1 token1 to get sparta


        await token1.approve(router.address, supply, {from:acc2}) // approve router to add token1
        await base.approve(router.address, supply, {from:acc2}) //approve router to add base

        await token1.approve(lock.address, supply, {from:acc2}) // approve lock 
        await base.approve(lock.address, supply, {from:acc2})
        await base.approve('0x93892e7ef9ab548bcb7b00354a51a84a4fe94cd7',supply, {from:acc2})

        
    });
}

async function burnLock(){
    it("Burn Lock for Allocation", async () => {
        let lockBalBefore = await lock.balanceOf(lock.address)
        await lock.approve(base.address, lockBalBefore, {from:acc0})
        let tx = await lock.burn()
    })
}

async function deployerListTKN(){
    it('deployer list TKN asset', async () =>{
        let deployer = acc0;
        let asset = rec.address;
        await lock.listBondAsset(asset, {from:deployer});
    })
}
async function depositTKN(){
    it(`It should recover`, async () => {
        let amount = _.BN2Str(2*_.one);
        await base.approve(rec.address, amount, {from: acc2}) // aprove
        await rec.recover(lock.address,amount,{from:acc2}) // recover
        let spBal = _.BN2Str(await base.balanceOf(lock.address))
        let balanceA = _.BN2Str(await base.balanceOf(rec.address));
        console.log(`swapped out - ${(balanceA/_.one)}`)
        console.log(`lockBal - ${spBal/_.one}`)
        let poolData = await utils.getPoolData(rec.address);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        console.log(`base - ${B/_.one}`)
        console.log(`tkn - ${T/_.one}`)
        let bondBal = _.BN2Str(await base.balanceOf(bondd.address))
        console.log(bondBal/_.one)
    })
}

// async function depositTKN(){
//     it(`It should deposit and recieve  back`, async () => {
//         let asset = token1.address
//         let amount = _.BN2Str(0.25*_.one)
//         let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
//         await lock.deposit(asset, amount,{from:acc2})
 
//     })
// }
// async function removeLiquidity() {
//     it(`remove liquidity`, async () => {
//         let token = token1.address
//         let tx = await router.removeLiquidity(10000, token, { from: acc2})
//         let balanceA = _.BN2Str(await base.balanceOf(acc2));
//         console.log(`Before swap account bal - ${balanceA/_.one}`)
//     })
// }
// async function swapToBase() {
//     it(`swap tkn `, async () => {
//         let token = token1.address
//         let balanceBefore = _.BN2Str(await base.balanceOf(acc2));
//         let spBal = _.BN2Str(await base.balanceOf(lock.address))
//         let tnkBalB = _.BN2Str(await token1.balanceOf(acc2))
//         await router.sell( _.BN2Str(_.one * 0.1855), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 0.3710), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 0.7420), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 1.4840), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 2.9680), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 5.9360), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 11.8720), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 23.7440), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 47.4880), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 94.9760), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 189.9520), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 379.9040), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 759.8080), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 1519.6160), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 3039.2320), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 6078.4640), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 12156.9280), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 24313.8560), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 48627.7120), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 97255.4240), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 194510.8480), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 389021.696), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 778043.392), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 1556086.784), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 3112173.568), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 6224347.136), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 12448694.272), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 24897388.544), token, { from: acc2})
//         await router.sell( _.BN2Str(_.one * 49794777.088), token, { from: acc2})

//         let balanceA = _.BN2Str(await base.balanceOf(acc2));
//         let poolData = await utils.getPoolData(token);
//         var B = _.getBN(poolData.baseAmount)
//         var T = _.getBN(poolData.tokenAmount)
//         console.log(`base - ${B/_.one}`)
//         console.log(`tkn - ${T/_.one}`)
//         console.log(`swapped out - ${(balanceA/_.one) - (balanceBefore/_.one)}`)
//         console.log(`lockBal - ${spBal/_.one}`)
//     })
// }



