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
var SYNTHVAULT = artifacts.require("./SynthVault.sol");

var SYNTH = artifacts.require("./synth.sol");
var LEND = artifacts.require("./SpartanLend.sol");
var LENDROUTER = artifacts.require("./lendRouter.sol");
var RESERVE = artifacts.require("./Reserve.sol");
var BOND = artifacts.require("./Bond.sol");
var BONDVault = artifacts.require("./BondVault.sol");
var TOKEN = artifacts.require("./Token1.sol");

var POOLFACTORY = artifacts.require("./poolFactory.sol");
var SYNTHFACTORY = artifacts.require("./synthFactory.sol");
var WBNB = artifacts.require("./WBNB");
var DAOVAULT = artifacts.require("./DaoVault.sol");
var UPGR = artifacts.require("./SPARTANUPGRADE.sol");

var base; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1; var synthTNK2; var synthBNB;
var acc0; var acc1; var acc2; var acc3;var now;
var allocation = 2500000;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
contract('Test Harvest Synths', function (accounts) {
    constructor(accounts)
     wrapBNB()
     createPoolWBNB()
     createPoolTKN1()
     addLiquidityBNB(acc0,_.BN2Str(1000*_.one),  _.BN2Str(50*_.one)); //SPV2
     addLiquidityBNB(acc1,_.BN2Str(1500*_.one),  _.BN2Str(70*_.one)); //SPV2
     addLiquidityTKN1(acc0,_.BN2Str(1500*_.one),  _.BN2Str(60*_.one)); //SPV2
     addLiquidityTKN1(acc1,_.BN2Str(1500*_.one),  _.BN2Str(60*_.one)); //SPV2
     curatePools()
     createSyntheticBNB()
     swapLayer1ToSynth(acc0,_.BN2Str(5000*_.one))
     swapLayer1ToSynth(acc2,_.BN2Str(1000*_.one))
     swapLayer1ToSynth(acc1,_.BN2Str(5000*_.one))
    //    harvestSynth()
     depositSynthBNB(acc1, _.BN2Str(0.3*_.one))
     depositSynthTKN2(acc1, _.BN2Str(0.3*_.one))
     depositSynthTKN3(acc1, _.BN2Str(0.3*_.one))
     depositSynthTKN4(acc1, _.BN2Str(0.3*_.one))
     depositSynthTKN5(acc1, _.BN2Str(0.3*_.one))

     depositSynthTKN3(acc2, _.BN2Str(0.3*_.one))
     depositSynthTKN4(acc2, _.BN2Str(0.3*_.one))

     depositSynthTKN5(acc1, _.BN2Str(0.3*_.one))

     depositSynthTKN4(acc1, _.BN2Str(0.3*_.one))

  
      harvestSynth()
      Withdraw(1000, acc1);
      WithdrawTKN2(5000, acc1);
      WithdrawTKN3(1000, acc1);
  
   
})

//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("Constructor events", async () => {
        base = await BASE.new() // deploy base
        wbnb = await WBNB.new() // deploy wBNB
        token1 = await TOKEN.new()
        token2 = await TOKEN.new()
        token3 = await TOKEN.new()
        token4 = await TOKEN.new()
        token5 = await TOKEN.new()
        token6 = await TOKEN.new()
        token7 = await TOKEN.new()
        token8 = await TOKEN.new()
        token9 = await TOKEN.new()
        
                     //deploy token
        Dao = await DAO.new(base.address)     // deploy daoV2
        synthV = await SYNTHVAULT.new(base.address, Dao.address) 
        utils = await UTILS.new(base.address, base.address, Dao.address) // deploy utilsV2
        router = await ROUTER.new(base.address, wbnb.address, Dao.address) //deploy router
        daoVault = await DAOVAULT.new(base.address, Dao.address);
        bondVault = await BONDVault.new(base.address, Dao.address)  //deploy new bond
        bond = await BOND.new(base.address, wbnb.address, Dao.address, bondVault.address);
        poolFactory = await POOLFACTORY.new(base.address,  wbnb.address, Dao.address) 
        synthFactory = await SYNTHFACTORY.new(base.address,  wbnb.address, Dao.address) 

        daoVault = await DAOVAULT.new(base.address, Dao.address);
        lendRouter = await LENDROUTER.new(base.address);

        lend = await LEND.new(base.address, lendRouter.address);
        SPReserve = await RESERVE.new(base.address) // deploy base 

        await Dao.setGenesisAddresses(router.address, utils.address, lend.address, bond.address, daoVault.address,poolFactory.address, synthFactory.address, SPReserve.address); 
        await base.changeDAO(Dao.address)  
        await synthV.changeNDAO(Dao.address)  
        await SPReserve.setIncentiveAddresses(router.address, lend.address,synthV.address,Dao.address );
        await SPReserve.start();

        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
       
         await base.transfer(SPReserve.address, _.getBN(_.BN2Str(10000 * _.one)))
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

        await token3.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token3.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token3.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token3.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token3.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token3.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token4.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token4.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token4.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token4.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token4.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token4.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token5.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token5.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token5.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token5.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token5.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token5.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token6.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token6.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token6.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token6.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token6.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token6.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
      

    });
}
async function wrapBNB() {
    it("It should wrap", async () => {
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*100), from:acc0});
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*100), from:acc1});
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*100), from:acc2});
        await wbnb.transfer(acc0, _.getBN(_.BN2Int(_.one * 100)), {from:acc0})
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 100)), {from:acc1})
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one * 100)), {from:acc2})
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function createPoolWBNB(SPT, token) {
    it("It should deploy BNB Pool", async () => {
        var _pool = await poolFactory.createPool.call( wbnb.address)
        await poolFactory.createPool(wbnb.address)
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")

        let supply = await base.totalSupply()
        await base.approve(poolWBNB.address, supply, { from: acc0 })
        await base.approve(poolWBNB.address, supply, { from: acc1 })

    })
}
async function createPoolTKN1(SPT, token) {
    it("It should deploy TKN1 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token1.address)
        await poolFactory.createPool(token1.address)
        poolTKN1 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        let supply = await base.totalSupply()
        await base.approve(poolTKN1.address, supply, { from: acc0 })
        await base.approve(poolTKN1.address, supply, { from: acc1 })
    })
    it("It should deploy TKN2 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token2.address)
        await poolFactory.createPool(token2.address)
        poolTKN2 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN2.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        let supply = await base.totalSupply()
        await base.approve(poolTKN2.address, supply, { from: acc0 })
        await base.approve(poolTKN2.address, supply, { from: acc1 })
    })
    it("It should deploy TKN3 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token3.address)
        await poolFactory.createPool(token3.address)
        poolTKN3 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN3.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        let supply = await base.totalSupply()
        await base.approve(poolTKN3.address, supply, { from: acc0 })
        await base.approve(poolTKN3.address, supply, { from: acc1 })
    })
    it("It should deploy TKN4 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token4.address)
        await poolFactory.createPool(token4.address)
        poolTKN4 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN4.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        let supply = await base.totalSupply()
        await base.approve(poolTKN4.address, supply, { from: acc0 })
        await base.approve(poolTKN4.address, supply, { from: acc1 })
    })
    it("It should deploy TKN5 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token5.address)
        await poolFactory.createPool(token5.address)
        poolTKN5 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN5.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        let supply = await base.totalSupply()
        await base.approve(poolTKN5.address, supply, { from: acc0 })
        await base.approve(poolTKN5.address, supply, { from: acc1 })
    })
    it("It should deploy TKN6 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token6.address)
        await poolFactory.createPool(token6.address)
        poolTKN6 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN6.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        let supply = await base.totalSupply()
        await base.approve(poolTKN6.address, supply, { from: acc0 })
        await base.approve(poolTKN6.address, supply, { from: acc1 })
    })


}
async function addLiquidityBNB(acc, b, t) {
    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = wbnb.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function addLiquidityTKN1(acc, b, t) {
    it(`It should addLiquidity TKN1 from ${acc}`, async () => {
        let token = token1.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
    it(`It should addLiquidity TKN2 from ${acc}`, async () => {
        let token = token2.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
    it(`It should addLiquidity TKN3 from ${acc}`, async () => {
        let token = token3.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
    it(`It should addLiquidity TKN4 from ${acc}`, async () => {
        let token = token4.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
    it(`It should addLiquidity TKN5 from ${acc}`, async () => {
        let token = token5.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
    it(`It should addLiquidity TKN6 from ${acc}`, async () => {
        let token = token6.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })

}
async function curatePools() {
    it("Curate POOls", async () => {
        await poolFactory.addCuratedPool(wbnb.address);
        await poolFactory.addCuratedPool(token1.address);
        await poolFactory.addCuratedPool(token2.address);
        await poolFactory.addCuratedPool(token3.address);
        await poolFactory.addCuratedPool(token4.address);
        await poolFactory.addCuratedPool(token5.address);
    })
}
async function createSyntheticBNB() {
    it("It should Create Synthetic BNB ", async () => {
        var _synth =  await synthFactory.createSynth.call(_.BNB);
        await synthFactory.createSynth(_.BNB);
        synthBNB = await SYNTH.at(_synth)
        let synth = await synthFactory.getSynth(_.BNB);
        let result = await synthFactory.isSynth(synth);
        assert.equal(result, true);
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
    it("It should Create Synthetic BUSD ", async () => {
        var _synth =  await synthFactory.createSynth.call(token2.address);
        await synthFactory.createSynth(token2.address);
        synthTKN2 = await SYNTH.at(_synth)
        let synth = await synthFactory.getSynth(token2.address);
        let result = await synthFactory.isSynth(synth);
        assert.equal(result, true);
        await synthTKN2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthTKN2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthTKN2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
    it("It should Create Synthetic DAI ", async () => {
        var _synth =  await synthFactory.createSynth.call(token3.address);
        await synthFactory.createSynth(token3.address);
        synthTKN3 = await SYNTH.at(_synth)
        let synth = await synthFactory.getSynth(token3.address);
        let result = await synthFactory.isSynth(synth);
        assert.equal(result, true);
        await synthTKN3.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthTKN3.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthTKN3.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
    it("It should Create Synthetic BTC ", async () => {
        var _synth =  await synthFactory.createSynth.call(token4.address);
        await synthFactory.createSynth(token4.address);
        synthTKN4 = await SYNTH.at(_synth)
        let synth = await synthFactory.getSynth(token4.address);
        let result = await synthFactory.isSynth(synth);
        assert.equal(result, true);
        await synthTKN4.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthTKN4.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthTKN4.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
    it("It should Create Synthetic BTC ", async () => {
        var _synth =  await synthFactory.createSynth.call(token5.address);
        await synthFactory.createSynth(token5.address);
        synthTKN5 = await SYNTH.at(_synth)
        let synth = await synthFactory.getSynth(token5.address);
        let result = await synthFactory.isSynth(synth);
        assert.equal(result, true);
        await synthTKN5.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthTKN5.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthTKN5.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function swapLayer1ToSynth(acc, x) {
    it("Swap SPARTA to BNB-SPS ", async () => {
        let synthOUT = synthBNB.address;
        await router.swapBaseToSynth(x,synthOUT,{from:acc});
    })
    it("Swap SPARTA to TKN2-SPS ", async () => {
        let synthOUT = synthTKN2.address;
        await router.swapBaseToSynth(x,synthOUT,{from:acc});
    })
    it("Swap SPARTA to TKN3-SPS ", async () => {
        let synthOUT = synthTKN3.address;
        await router.swapBaseToSynth(x,synthOUT,{from:acc});
    })
    it("Swap SPARTA to TKN4-SPS ", async () => {
        let synthOUT = synthTKN4.address;
        await router.swapBaseToSynth(x,synthOUT,{from:acc});
    })
    it("Swap SPARTA to TKN5-SPS ", async () => {
        let synthOUT = synthTKN5.address;
        await router.swapBaseToSynth(x,synthOUT,{from:acc});
    })
    it("Swap SPARTA to TKN6-SPS ", async () => {
        let synthOUT = token1.address;
        await truffleAssert.reverts(router.swapBaseToSynth(x,synthOUT,{from:acc})), "!synth";
    })
}
async function depositSynthBNB(acc, x) {
    it("Deposit Synth into Vault ", async () => {
        
        let synth = synthBNB.address;
        let synthBal = _.getBN(await synthBNB.balanceOf(acc));
        let sVStart = _.getBN(await synthBNB.balanceOf(synthV.address));

        let memberDeposits = _.getBN(await synthV.getMemberDeposit(synth, acc))
        
        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let memberTime = _.BN2Str(await synthV.getMemberLastTime( acc))

        let token = await synthBNB.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)
        // console.log("x ", x);
        // console.log("memberDeposits ", _.BN2Str(memberDeposits));

        let weight = (_.getBN(x).times(X)).div(Y);
         
        await synthV.deposit(synth,x,{from:acc});
        
        let synthBalA = _.getBN(await synthBNB.balanceOf(acc))
        let sVStartA = _.getBN(await synthBNB.balanceOf(synthV.address));

        let memberWeightA = _.BN2Str(await synthV.getMemberWeight(acc))
        let memberTimeA = _.BN2Str(await synthV.getMemberLastTime(acc))
        let memberDepositsA = _.getBN(await synthV.getMemberDeposit(synth, acc))

        assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.minus(x)));
        assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.plus(x)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposits.plus(x)));
        assert.exists(_.BN2Str(memberTimeA));
    })
}
async function depositSynthTKN2(acc, x) {
    it("Deposit Synth into Vault ", async () => {
        
        let synth = synthTKN2.address;
        let synthBal = _.getBN(await synthTKN2.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN2.balanceOf(synthV.address));

        let memberDeposits = _.getBN(await synthV.getMemberDeposit(synth, acc))
        
        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let memberTime = _.BN2Str(await synthV.getMemberLastTime( acc))

        let token = await synthTKN2.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)
        // console.log("x ", x);
        // console.log("memberDeposits ", _.BN2Str(memberDeposits));

        let weight = (_.getBN(x).times(X)).div(Y);
         
        await synthV.deposit(synth,x,{from:acc});
        
        let synthBalA = _.getBN(await synthTKN2.balanceOf(acc))
        let sVStartA = _.getBN(await synthTKN2.balanceOf(synthV.address));

        let memberWeightA = _.BN2Str(await synthV.getMemberWeight(acc))
        let memberTimeA = _.BN2Str(await synthV.getMemberLastTime(acc))
        let memberDepositsA = _.getBN(await synthV.getMemberDeposit(synth, acc))

        assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.minus(x)));
        assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.plus(x)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposits.plus(x)));
        assert.exists(_.BN2Str(memberTimeA));
    })
}
async function depositSynthTKN3(acc, x) {
    it("Deposit Synth into Vault ", async () => {
        
        let synth = synthTKN3.address;
        let synthBal = _.getBN(await synthTKN3.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN3.balanceOf(synthV.address));

        let memberDeposits = _.getBN(await synthV.getMemberDeposit(synth, acc))
        
        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let memberTime = _.BN2Str(await synthV.getMemberLastTime( acc))

        let token = await synthTKN3.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)
        // console.log("x ", x);
        // console.log("memberDeposits ", _.BN2Str(memberDeposits));

        let weight = (_.getBN(x).times(X)).div(Y);
         
        await synthV.deposit(synth,x,{from:acc});
        
        let synthBalA = _.getBN(await synthTKN3.balanceOf(acc))
        let sVStartA = _.getBN(await synthTKN3.balanceOf(synthV.address));

        let memberWeightA = _.BN2Str(await synthV.getMemberWeight(acc))
        let memberTimeA = _.BN2Str(await synthV.getMemberLastTime(acc))
        let memberDepositsA = _.getBN(await synthV.getMemberDeposit(synth, acc))

        assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.minus(x)));
        assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.plus(x)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposits.plus(x)));
        assert.exists(_.BN2Str(memberTimeA));
    })
}
async function depositSynthTKN4(acc, x) {
    it("Deposit Synth into Vault ", async () => {
        
        let synth = synthTKN4.address;
        let synthBal = _.getBN(await synthTKN4.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN4.balanceOf(synthV.address));

        let memberDeposits = _.getBN(await synthV.getMemberDeposit(synth, acc))
        
        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let memberTime = _.BN2Str(await synthV.getMemberLastTime( acc))

        let token = await synthTKN4.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)
        // console.log("x ", x);
        // console.log("memberDeposits ", _.BN2Str(memberDeposits));

        let weight = (_.getBN(x).times(X)).div(Y);
         
        await synthV.deposit(synth,x,{from:acc});
        
        let synthBalA = _.getBN(await synthTKN4.balanceOf(acc))
        let sVStartA = _.getBN(await synthTKN4.balanceOf(synthV.address));

        let memberWeightA = _.BN2Str(await synthV.getMemberWeight(acc))
        let memberTimeA = _.BN2Str(await synthV.getMemberLastTime(acc))
        let memberDepositsA = _.getBN(await synthV.getMemberDeposit(synth, acc))

        assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.minus(x)));
        assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.plus(x)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposits.plus(x)));
        assert.exists(_.BN2Str(memberTimeA));
    })
}
async function depositSynthTKN5(acc, x) {
    it("Deposit Synth into Vault ", async () => {
        
        let synth = synthTKN5.address;
        let synthBal = _.getBN(await synthTKN5.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN5.balanceOf(synthV.address));

        let memberDeposits = _.getBN(await synthV.getMemberDeposit(synth, acc))
        
        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let memberTime = _.BN2Str(await synthV.getMemberLastTime( acc))

        let token = await synthTKN5.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)
        // console.log("x ", x);
        // console.log("memberDeposits ", _.BN2Str(memberDeposits));

        let weight = (_.getBN(x).times(X)).div(Y);
         
        await synthV.deposit(synth,x,{from:acc});
        
        let synthBalA = _.getBN(await synthTKN5.balanceOf(acc))
        let sVStartA = _.getBN(await synthTKN5.balanceOf(synthV.address));

        let memberWeightA = _.BN2Str(await synthV.getMemberWeight(acc))
        let memberTimeA = _.BN2Str(await synthV.getMemberLastTime(acc))
        let memberDepositsA = _.getBN(await synthV.getMemberDeposit(synth, acc))

        assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.minus(x)));
        assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.plus(x)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposits.plus(x)));
        assert.exists(_.BN2Str(memberTimeA));
    })
}
async function harvestSynth() {
    it("Harvest rewards ACC0", async () => {
        let synth = synthBNB.address;
        let acc = acc0;
        await sleep(5000);

        let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));
        
        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let memberTime = _.getBN(await synthV.getMemberLastTime(acc))
        let totalWeight = _.getBN(await synthV.totalWeight())
 
        // console.log("totalWeight ",_.BN2Str(totalWeight))   
        // console.log("memberWeight ",_.BN2Str(memberWeight)) 

        now = _.getBN((new Date())/1000).plus(61)
       

        let secondsPast = _.BN2Str(now.minus(memberTime));
        // console.log("Seconds Past ",_.BN2Str(secondsPast));

        let reserve = _.getBN(SPReserveBal).div(30);
        let vaultClaim =  reserve.times(1000).div(10000)
        let share = _.BN2Str(memberWeight.times(vaultClaim).div(totalWeight))
        let reward = _.BN2Str(_.getBN(share).times(secondsPast).div(_.getBN(86400)));
        let asymAdd = _.getBN(await utils.calcLiquidityUnitsAsym(reward, poolWBNB.address))
       

        await synthV.harvest({from:acc});
        let token = await synthBNB.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)
        let synthMint = _.getBN(await utils.calcAsymmetricValueToken(poolWBNB.address,asymAdd));

        let weightAdded = (_.getBN(synthMint).times(X)).div(Y);
       
        
        //  console.log("now ",_.BN2Str(now))   
        //   console.log("secondsPast ",_.BN2Str(secondsPast))  
        //   console.log("reward ",_.BN2Str(reward))    

        let memberTimeA = _.getBN(await synthV.getMemberLastTime(acc))
        let memberWeightA = _.BN2Str(await synthV.getMemberWeight(acc))
        let totalWeightA = _.BN2Str(await synthV.totalWeight())
        // assert.exists(_.BN2Str(memberTimeA.minus(now)))
        // assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weightAdded)));
        // assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.plus(weightAdded)));
        


    })
    it("Harvest rewards ACC2", async () => {
        let synth = synthBNB.address;
        let acc = acc2;
        await sleep(5000);

        // let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));
        
        // let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        // let memberTime = _.getBN(await synthV.getMemberLastTime( acc))
        // let totalWeight = _.getBN(await synthV.totalWeight())
 
        // // console.log("totalWeight ",_.BN2Str(totalWeight))   
        // // console.log("memberWeight ",_.BN2Str(memberWeight)) 

        // now = _.getBN((new Date())/1000).plus(62)
       

        // let secondsPast = _.BN2Str(now.minus(memberTime));
        // //  console.log("Seconds Past ",_.BN2Str(secondsPast));

        // let reserve = _.getBN(SPReserveBal).div(30);
        // let vaultClaim =  reserve.times(1000).div(10000)
        // let share = _.BN2Str(memberWeight.times(vaultClaim).div(totalWeight))
        // let reward = _.BN2Str(_.getBN(share).times(secondsPast).div(_.getBN(86400)));
        // let asymAdd = _.getBN(await utils.calcLiquidityUnitsAsym(reward, poolWBNB.address))
       

        await synthV.harvest({from:acc});
        // let token = await synthBNB.LayerONE();
        // let poolTO = await utils.getPoolData(token);
        // const X = _.getBN(poolTO.baseAmount)
        // const Y = _.getBN(poolTO.tokenAmount)
        // let synthMint = _.getBN(await utils.calcAsymmetricValueToken(poolWBNB.address,asymAdd));

        // let weightAdded = (_.getBN(synthMint).times(X)).div(Y);
       
        
        // //  console.log("now ",_.BN2Str(now))   
        // //   console.log("secondsPast ",_.BN2Str(secondsPast))  
        // //   console.log("reward ",_.BN2Str(reward))    

        // let memberTimeA = _.getBN(await synthV.getMemberLastTime( acc))
        // let memberWeightA = _.BN2Str(await synthV.getMemberWeight(acc))
        // let totalWeightA = _.BN2Str(await synthV.totalWeight())
        // assert.exists(_.BN2Str(memberTimeA.minus(now)))
        // assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weightAdded)));
        // assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.plus(weightAdded)));
    })
    it("Harvest rewards ACC1", async () => {
        let synth = synthBNB.address;
        let acc = acc1;
         await sleep(5000);

        // let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));
        
        // let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        // let memberTime = _.getBN(await synthV.getMemberLastTime( acc))
        // let totalWeight = _.getBN(await synthV.totalWeight())
 
        // // console.log("totalWeight ",_.BN2Str(totalWeight))   
        // //  console.log("memberTime ",_.BN2Str(memberTime)) 

        // now = _.getBN((new Date())/1000).plus(62)
       

        // let secondsPast = _.BN2Str(now.minus(memberTime));
        // // console.log("Seconds Past ",_.BN2Str(secondsPast));

        // let reserve = _.getBN(SPReserveBal).div(30);
        // let vaultClaim =  reserve.times(1000).div(10000)
        // let share = _.BN2Str(memberWeight.times(vaultClaim).div(totalWeight))
        // let reward = _.BN2Str(_.getBN(share).times(secondsPast).div(_.getBN(86400)));
        // let asymAdd = _.getBN(await utils.calcLiquidityUnitsAsym(reward, poolWBNB.address))
       

        await synthV.harvest({from:acc});
        // let token = await synthBNB.LayerONE();
        // let poolTO = await utils.getPoolData(token);
        // const X = _.getBN(poolTO.baseAmount)
        // const Y = _.getBN(poolTO.tokenAmount)
        // let synthMint = _.getBN(await utils.calcAsymmetricValueToken(poolWBNB.address,asymAdd));

        // let weightAdded = (_.getBN(synthMint).times(X)).div(Y);
       
        
        // //  console.log("now ",_.BN2Str(now))   
        // //   console.log("secondsPast ",_.BN2Str(secondsPast))  
        // //   console.log("reward ",_.BN2Str(reward))    

        // let memberTimeA = _.getBN(await synthV.getMemberLastTime( acc))
        // let memberWeightA = _.BN2Str(await synthV.getMemberWeight(acc))
        // let totalWeightA = _.BN2Str(await synthV.totalWeight())
        // assert.exists(_.BN2Str(memberTimeA.minus(now)))
        // assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weightAdded)));
        // assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.plus(weightAdded)));
        

    })
}
async function Withdraw(bp, acc) {
    it("Withdraw synths + rewards", async () => {
        let synth = synthBNB.address;

        let synthBal = _.getBN(await synthBNB.balanceOf(acc));
        let sVStart = _.getBN(await synthBNB.balanceOf(synthV.address));
        let memberDeposit = _.getBN(await synthV.getMemberDeposit(synth, acc))
        let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));

        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let totalWeight = _.getBN(await synthV.totalWeight())
    
        let memberWeightRem = _.BN2Str(memberWeight.times(bp).div(10000));
        let memberDeposits = _.BN2Str(memberDeposit.times(bp).div(10000));


        await synthV.withdraw(synth, bp,{from:acc});
    
        let synthBalA = _.getBN(await synthBNB.balanceOf(acc));
        let sVStartA = _.getBN(await synthBNB.balanceOf(synthV.address));
        
        let SPReserveBalA = _.getBN(await base.balanceOf(SPReserve.address));
        
        let memberWeightA = _.getBN(await synthV.getMemberWeight(acc))
        let memberTimeA = _.getBN(await synthV.getMemberLastTime(acc))
        let totalWeightA = _.getBN(await synthV.totalWeight())
        let memberDepositsA = _.getBN(await synthV.getMemberDeposit(synth, acc))

         assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.plus(memberDeposits)));
         assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.minus(memberDeposits)));
    
         assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.minus(memberWeightRem)));
         assert.exists(_.BN2Str(memberTimeA));
         assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposit.minus(memberDeposits)));
    })
    // it("Withdraw synths + rewards", async () => {
    //     let synth = synthBNB.address;
    //     await sleep(5000);
    //     let acc = acc1;
    //     let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));
        
    //     let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
    //     let memberReward = _.getBN(await synthV.getMemberReward(synth, acc))
    //     let memberTime = _.BN2Str(await synthV.getMemberLastTime(synth, acc))
    //     let totalWeight = _.getBN(await synthV.totalWeight())
    //     let totalRewards = _.getBN(await synthV.totalRewards())
    //     await synthV.withdraw(synth, 5000,{from:acc});
    // })
}
async function WithdrawTKN2(bp, acc) {
    it("Withdraw synths + rewards", async () => {
        let synth = synthTKN2.address;

        let synthBal = _.getBN(await synthTKN2.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN2.balanceOf(synthV.address));
        let memberDeposit = _.getBN(await synthV.getMemberDeposit(synth, acc))
        let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));

        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let totalWeight = _.getBN(await synthV.totalWeight())
    
        let memberWeightRem = _.BN2Str(memberWeight.times(bp).div(10000));
        let memberDeposits = _.BN2Str(memberDeposit.times(bp).div(10000));


        await synthV.withdraw(synth, bp,{from:acc});
    
        let synthBalA = _.getBN(await synthTKN2.balanceOf(acc));
        let sVStartA = _.getBN(await synthTKN2.balanceOf(synthV.address));
        
        let SPReserveBalA = _.getBN(await base.balanceOf(SPReserve.address));
        
        let memberWeightA = _.getBN(await synthV.getMemberWeight(acc))
        let memberTimeA = _.getBN(await synthV.getMemberLastTime(acc))
        let totalWeightA = _.getBN(await synthV.totalWeight())
        let memberDepositsA = _.getBN(await synthV.getMemberDeposit(synth, acc))

         assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.plus(memberDeposits)));
         assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.minus(memberDeposits)));
    
         assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.minus(memberWeightRem)));
         assert.exists(_.BN2Str(memberTimeA));
         assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposit.minus(memberDeposits)));
    })
    // it("Withdraw synths + rewards", async () => {
    //     let synth = synthBNB.address;
    //     await sleep(5000);
    //     let acc = acc1;
    //     let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));
        
    //     let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
    //     let memberReward = _.getBN(await synthV.getMemberReward(synth, acc))
    //     let memberTime = _.BN2Str(await synthV.getMemberLastTime(synth, acc))
    //     let totalWeight = _.getBN(await synthV.totalWeight())
    //     let totalRewards = _.getBN(await synthV.totalRewards())
    //     await synthV.withdraw(synth, 5000,{from:acc});
    // })
}
async function WithdrawTKN3(bp, acc) {
    it("Withdraw synths + rewards", async () => {
        let synth = synthTKN3.address;

        let synthBal = _.getBN(await synthTKN3.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN3.balanceOf(synthV.address));
        let memberDeposit = _.getBN(await synthV.getMemberDeposit(synth, acc))
        let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));

        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let totalWeight = _.getBN(await synthV.totalWeight())
    
        let memberWeightRem = _.BN2Str(memberWeight.times(bp).div(10000));
        let memberDeposits = _.BN2Str(memberDeposit.times(bp).div(10000));


        await synthV.withdraw(synth, bp,{from:acc});
    
        let synthBalA = _.getBN(await synthTKN3.balanceOf(acc));
        let sVStartA = _.getBN(await synthTKN3.balanceOf(synthV.address));
        
        let SPReserveBalA = _.getBN(await base.balanceOf(SPReserve.address));
        
        let memberWeightA = _.getBN(await synthV.getMemberWeight(acc))
        let memberTimeA = _.getBN(await synthV.getMemberLastTime(acc))
        let totalWeightA = _.getBN(await synthV.totalWeight())
        let memberDepositsA = _.getBN(await synthV.getMemberDeposit(synth, acc))

         assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.plus(memberDeposits)));
         assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.minus(memberDeposits)));
    
         assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.minus(memberWeightRem)));
         assert.exists(_.BN2Str(memberTimeA));
         assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposit.minus(memberDeposits)));
    })
    // it("Withdraw synths + rewards", async () => {
    //     let synth = synthBNB.address;
    //     await sleep(5000);
    //     let acc = acc1;
    //     let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));
        
    //     let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
    //     let memberReward = _.getBN(await synthV.getMemberReward(synth, acc))
    //     let memberTime = _.BN2Str(await synthV.getMemberLastTime(synth, acc))
    //     let totalWeight = _.getBN(await synthV.totalWeight())
    //     let totalRewards = _.getBN(await synthV.totalRewards())
    //     await synthV.withdraw(synth, 5000,{from:acc});
    // })
}
async function WithdrawTKN4(bp, acc) {
    it("Withdraw synths + rewards", async () => {
        let synth = synthTKN4.address;

        let synthBal = _.getBN(await synthTKN4.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN4.balanceOf(synthV.address));
        let memberDeposit = _.getBN(await synthV.getMemberDeposit(synth, acc))
        let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));

        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let totalWeight = _.getBN(await synthV.totalWeight())
    
        let memberWeightRem = _.BN2Str(memberWeight.times(bp).div(10000));
        let memberDeposits = _.BN2Str(memberDeposit.times(bp).div(10000));


        await synthV.withdraw(synth, bp,{from:acc});
    
        let synthBalA = _.getBN(await synthTKN4.balanceOf(acc));
        let sVStartA = _.getBN(await synthTKN4.balanceOf(synthV.address));
        
        let SPReserveBalA = _.getBN(await base.balanceOf(SPReserve.address));
        
        let memberWeightA = _.getBN(await synthV.getMemberWeight(acc))
        let memberTimeA = _.getBN(await synthV.getMemberLastTime(acc))
        let totalWeightA = _.getBN(await synthV.totalWeight())
        let memberDepositsA = _.getBN(await synthV.getMemberDeposit(synth, acc))

         assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.plus(memberDeposits)));
         assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.minus(memberDeposits)));
    
         assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.minus(memberWeightRem)));
         assert.exists(_.BN2Str(memberTimeA));
         assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposit.minus(memberDeposits)));
    })
    // it("Withdraw synths + rewards", async () => {
    //     let synth = synthBNB.address;
    //     await sleep(5000);
    //     let acc = acc1;
    //     let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));
        
    //     let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
    //     let memberReward = _.getBN(await synthV.getMemberReward(synth, acc))
    //     let memberTime = _.BN2Str(await synthV.getMemberLastTime(synth, acc))
    //     let totalWeight = _.getBN(await synthV.totalWeight())
    //     let totalRewards = _.getBN(await synthV.totalRewards())
    //     await synthV.withdraw(synth, 5000,{from:acc});
    // })
}
async function WithdrawTKN5(bp, acc) {
    it("Withdraw synths + rewards", async () => {
        let synth = synthTKN5.address;

        let synthBal = _.getBN(await synthTKN5.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN5.balanceOf(synthV.address));
        let memberDeposit = _.getBN(await synthV.getMemberDeposit(synth, acc))
        let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));

        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let totalWeight = _.getBN(await synthV.totalWeight())
    
        let memberWeightRem = _.BN2Str(memberWeight.times(bp).div(10000));
        let memberDeposits = _.BN2Str(memberDeposit.times(bp).div(10000));


        await synthV.withdraw(synth, bp,{from:acc});
    
        let synthBalA = _.getBN(await synthTKN5.balanceOf(acc));
        let sVStartA = _.getBN(await synthTKN5.balanceOf(synthV.address));
        
        let SPReserveBalA = _.getBN(await base.balanceOf(SPReserve.address));
        
        let memberWeightA = _.getBN(await synthV.getMemberWeight(acc))
        let memberTimeA = _.getBN(await synthV.getMemberLastTime(acc))
        let totalWeightA = _.getBN(await synthV.totalWeight())
        let memberDepositsA = _.getBN(await synthV.getMemberDeposit(synth, acc))

         assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.plus(memberDeposits)));
         assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.minus(memberDeposits)));
    
         assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.minus(memberWeightRem)));
         assert.exists(_.BN2Str(memberTimeA));
         assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposit.minus(memberDeposits)));
    })
    // it("Withdraw synths + rewards", async () => {
    //     let synth = synthBNB.address;
    //     await sleep(5000);
    //     let acc = acc1;
    //     let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));
        
    //     let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
    //     let memberReward = _.getBN(await synthV.getMemberReward(synth, acc))
    //     let memberTime = _.BN2Str(await synthV.getMemberLastTime(synth, acc))
    //     let totalWeight = _.getBN(await synthV.totalWeight())
    //     let totalRewards = _.getBN(await synthV.totalRewards())
    //     await synthV.withdraw(synth, 5000,{from:acc});
    // })
}


//helpers
function ShowBNBPool() {
    it("Show Old POOls", async () => {
    let tknA = _.BN2Str(await poolWBNBM.tokenAmount());
    let baseA = _.BN2Str(await poolWBNBM.baseAmount());
    let lptoken = _.BN2Str(await poolWBNBM.totalSupply());
    console.log('================= old POOL DEPTH ==================')
    console.log(`SPARTA - ${baseA/_.one}`);
    console.log(`BNB - ${tknA/_.one}`);
    console.log(`lps - ${lptoken/_.one}`);
})
}
function ShowTKNPool() {
    it("Show NEW POOL", async () => {
    let tknA = _.BN2Str(await poolTKN1.tokenAmount());
    let baseA = _.BN2Str(await poolTKN1.baseAmount());
    let lptoken = _.BN2Str(await poolTKN1.totalSupply());
    console.log('================= new POOL DEPTH ==================')
    console.log(`SPARTA - ${baseA/_.one}`);
    console.log(`TKN - ${tknA/_.one}`);
    console.log(`lps - ${lptoken/_.one}`);
})
}






