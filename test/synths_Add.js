const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var BASE = artifacts.require("./BaseMinted.sol");
var DAO = artifacts.require("./Dao.sol");
var ROUTER = artifacts.require("./Router.sol");
var POOL = artifacts.require("./Pool.sol");
var UTILS = artifacts.require("./Utils.sol");
var synthRouter = artifacts.require("./synthRouter.sol");
var SYNTH = artifacts.require("./synth.sol");
var BOND = artifacts.require("./Bond.sol");
var TOKEN = artifacts.require("./Token1.sol");
var TOKEN2 = artifacts.require("./Token2.sol");
var WBNB = artifacts.require("./WBNB");
var DAOVAULT = artifacts.require("./DaoVault.sol");

var base; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1; var synthTNK2; var synthBNB;
var acc0; var acc1; var acc2; var acc3;


contract('DAO', function (accounts) {
    constructor(accounts)
    wrapBNB()
    createPoolWBNB(20*_.one, 10*_.one)
    createPoolTKN1(10*_.one, 60*_.one)
    createPoolTKN2(40*_.one, 13*_.one)
    curatePools()
    createFailSynthTKN1()
    createSyntheticBNB()
    addCollateralForSyntheticBNB()

})

//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        base = await BASE.new() // deploy base
        wbnb = await WBNB.new() // deploy wBNB
        utils = await UTILS.new(base.address) // deploy utilsV2
        Dao = await DAO.new(base.address)     // deploy daoV2
        router = await ROUTER.new(base.address, wbnb.address) //deploy router
        daoVault = await DAOVAULT.new(base.address);
        await base.changeDAO(Dao.address)     
        synthRouter = await synthRouter.new(base.address) //deploy synthRouter
        bond = await BOND.new(base.address)     //deploy new bond
        token1 = await TOKEN.new()             //deploy token
        token2 = await TOKEN2.new() 

        await Dao.setGenesisAddresses(router.address, utils.address, synthRouter.address, bond.address, daoVault.address);
    

        let supply = await token1.totalSupply()
        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(router.address, _.getBN(_.BN2Str(100000 * _.one)))
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token1.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token2.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

    });
}
async function wrapBNB() {
    it("It should wrap", async () => {
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*100), from:acc0});
        await wbnb.transfer(acc0, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function createPoolWBNB(SPT, token) {
    it("It should deploy BNB Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(SPT),_.BN2Str(token), wbnb.address)
        await router.createPool(_.BN2Str(SPT), _.BN2Str(token), wbnb.address)
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(SPT), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.BN2Str(token), 'wbnb balance')

        let supply = await base.totalSupply()
        await base.approve(poolWBNB.address, supply, { from: acc0 })
        await base.approve(poolWBNB.address, supply, { from: acc1 })
    })
}
async function createPoolTKN1(SPT, token) {
    it("It should deploy TKN1 Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(SPT), _.BN2Str(token), token1.address)
        await router.createPool(_.BN2Str(SPT), _.BN2Str(token), token1.address)
        poolTKN1 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(SPT), 'base balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(token), 'token1 balance')

        let supply = await base.totalSupply()
        await base.approve(poolTKN1.address, supply, { from: acc0 })
        await base.approve(poolTKN1.address, supply, { from: acc1 })
    })
}
async function createPoolTKN2(SPT, token) {
    it("It should deploy TKN2 Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(SPT), _.BN2Str(token), token2.address)
        await router.createPool(_.BN2Str(SPT), _.BN2Str(token), token2.address)
        poolTKN2 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN2.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN2.address)), _.BN2Str(SPT), 'base balance')
        assert.equal(_.BN2Str(await token2.balanceOf(poolTKN2.address)), _.BN2Str(token), 'token1 balance')
        
        let supply = await base.totalSupply()
        await base.approve(poolTKN2.address, supply, { from: acc0 })
        await base.approve(poolTKN2.address, supply, { from: acc1 })
    })
}
async function curatePools() {
    it("Curate POOls", async () => {
        await router.addCuratedPool(wbnb.address);
        //await router.addCuratedPool(token1.address);
        await router.addCuratedPool(token2.address);
        // console.log(poolWBNB.address)
        // console.log(poolTKN1.address)
        // console.log(poolTKN2.address)
        await router.challengLowestCuratedPool(token2.address);
        let curatedP = await router.curatedPools(0);
        // console.log(curatedP)
        // //assert.equal()
       
    })
}
async function createFailSynthTKN1() {
it('should fail to create synth', async () =>{
    let inputLPToken = _.BN2Str(1*_.one)
    try {
        await synthRouter.createSynth(poolTKN1.address,token1.address, inputLPToken);
        assert.fail("Expected fail");
    }
    catch (err) {
        assert.include(err.message, "revert", "Must be Curated");
    }

})
}
async function createSyntheticBNB() {
    it("It should Create Synthetic BNB ", async () => {
        let inputLPToken = _.BN2Str(1*_.one)
        var _synth =  await synthRouter.createSynth.call(poolTKN2.address,wbnb.address, inputLPToken);
        await synthRouter.createSynth(poolTKN2.address,wbnb.address, inputLPToken);
        let synthData = await utils.getSynthData(wbnb.address);
        synthBNB = await SYNTH.at(_synth)
        let synthBNBBAL = _.BN2Str(await synthBNB.balanceOf(acc0));
        let colACC0 = _.BN2Str(await synthBNB.collateralAmount(acc0, poolTKN2.address));
        let debtACC0 = _.BN2Str(await synthBNB.debtAmount(acc0));
        assert.equal(colACC0, _.BN2Str(1*_.one),'col do not match' )
       // console.log(debtACC0);
        assert.equal(synthData.totalDebt,synthBNBBAL,'synth matches' )
        
       
    })
}

async function addCollateralForSyntheticBNB() {
    it("It should add collateral for Synthetic BNB", async () => {
        let inputLPToken = _.BN2Str(1*_.one)
        await synthRouter.addCollateral(inputLPToken,poolTKN2.address, synthBNB.address);
        let synthData = await utils.getSynthData(wbnb.address);
        let synthBNBBAL = _.BN2Str(await synthBNB.balanceOf(acc0));
        //console.log(synthBNBBAL);
        let colACC0 = _.BN2Str(await synthBNB.collateralAmount(acc0, poolTKN2.address));
        let debtACC0 = _.BN2Str(await synthBNB.debtAmount(acc0));
        assert.equal(synthData.totalDebt,synthBNBBAL,'synth do not match' )
        assert.equal(colACC0, _.BN2Str(2*_.one),'col do not match')
        assert.equal(debtACC0, synthData.totalDebt,'debt do not match')
       
    })
}
