const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var DAO = artifacts.require("./Dao.sol");
var SPARTA = artifacts.require("./Sparta.sol");
var UTILS = artifacts.require("./Utils.sol");
var TOKEN = artifacts.require("./Token1.sol");
var RESERVE = artifacts.require("./Reserve.sol");
var DAOVAULT = artifacts.require("./DaoVault.sol");
var BONDVAULT = artifacts.require("./BondVault.sol");
var POOL = artifacts.require("./Pool.sol");
var POOLFACTORY = artifacts.require("./PoolFactory.sol");
var ROUTER = artifacts.require("./Router.sol");
var SYNTHVAULT = artifacts.require("./SynthVault.sol");
var WBNB = artifacts.require("./WBNB");

var SYNTH = artifacts.require("./Synth.sol");
var SYNTHFACTORY = artifacts.require("./SynthFactory.sol");

var sparta; var token1;  var token2; var wbnb;
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
      swapLayer1ToSynth(acc0,_.BN2Str(50*_.one))
      swapLayer1ToSynth(acc2,_.BN2Str(10*_.one))
      swapLayer1ToSynth(acc1,_.BN2Str(50*_.one))
    //    swapSynthToLayer1(acc0,_.BN2Str(0.1*_.one) )
    //    swapSynthToLayer1(acc2,_.BN2Str(0.2*_.one) )
    //    swapSynthToLayer1(acc1,_.BN2Str(0.3*_.one) )
         harvestSynth()
      depositSynthBNB(acc1)
       depositSynthTKN2(acc1)
    //   depositSynthTKN3(acc1, _.BN2Str(0.3*_.one))
    //  depositSynthTKN4(acc1, _.BN2Str(0.3*_.one))
    //  depositSynthTKN5(acc1, _.BN2Str(0.3*_.one))

    //  depositSynthTKN3(acc2, _.BN2Str(0.3*_.one))
    //  depositSynthTKN4(acc2, _.BN2Str(0.3*_.one))

    //  depositSynthTKN5(acc1, _.BN2Str(0.3*_.one))

    //  depositSynthTKN4(acc1, _.BN2Str(0.3*_.one))
      realise()
  
    //    harvestSynth()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()
       realise()

  

    //    Withdraw(1000, acc1);
    //    WithdrawTKN2(5000, acc1);
    //    WithdrawTKN3(1000, acc1);
  
   
})

//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("Constructor events", async () => {
        sparta = await SPARTA.new(acc0) // deploy sparta v2
        wbnb = await WBNB.new() // deploy wBNB 
        Dao = await DAO.new(sparta.address)     // deploy daoV2
        utils = await UTILS.new(sparta.address) // deploy utilsV2
        token1 = await TOKEN.new()
        token2 = await TOKEN.new()
        token3 = await TOKEN.new()
        token4 = await TOKEN.new()
        token5 = await TOKEN.new()
        
                     //deploy token
        reserve = await RESERVE.new(sparta.address) // deploy reserve 
        daoVault = await DAOVAULT.new(sparta.address); // deploy daoVault
        bondVault = await BONDVAULT.new(sparta.address); // deploy bondVault
        synthVault = await SYNTHVAULT.new(sparta.address); // deploy synthVault
        router = await ROUTER.new(sparta.address, wbnb.address,); // deploy router
        poolFactory = await POOLFACTORY.new(sparta.address,  wbnb.address) // deploy poolfactory
        synthFactory = await SYNTHFACTORY.new(sparta.address,  wbnb.address) // deploy synthFactory
              
        await Dao.setGenesisAddresses(router.address,utils.address,reserve.address);
        await Dao.setVaultAddresses(daoVault.address,bondVault.address, synthVault.address);
        await Dao.setFactoryAddresses(poolFactory.address,synthFactory.address);
        await sparta.changeDAO(Dao.address)
 
        await reserve.setIncentiveAddresses(router.address,utils.address,synthVault.address,Dao.address );
        await reserve.flipEmissions();    
        await sparta.flipEmissions();  
        await sparta.flipMinting();

        await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
       await sparta.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))

       await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
       await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))

       await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
       await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
       await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

       await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
       await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
       await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

       await sparta.approve(Dao.address, _.BN2Str(500000 * _.one), { from: acc0 })
       await sparta.approve(Dao.address, _.BN2Str(500000 * _.one), { from: acc1 })
       await sparta.approve(Dao.address, _.BN2Str(500000 * _.one), { from: acc2 })


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
        var _pool = await poolFactory.createPool.call(_.BNB)
        await poolFactory.createPool(_.BNB)
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")

        let supply = await sparta.totalSupply()
        await sparta.approve(poolWBNB.address, supply, { from: acc0 })
        await sparta.approve(poolWBNB.address, supply, { from: acc1 })

    })
}

async function createPoolTKN1(SPT, token) {
    it("It should deploy TKN1 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token1.address)
        await poolFactory.createPool(token1.address)
        poolTKN1 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")
        let supply = await sparta.totalSupply()
        await sparta.approve(poolTKN1.address, supply, { from: acc0 })
        await sparta.approve(poolTKN1.address, supply, { from: acc1 })
    })
    it("It should deploy TKN2 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token2.address)
        await poolFactory.createPool(token2.address)
        poolTKN2 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN2.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")
        let supply = await sparta.totalSupply()
        await sparta.approve(poolTKN2.address, supply, { from: acc0 })
        await sparta.approve(poolTKN2.address, supply, { from: acc1 })
    })
    it("It should deploy TKN3 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token3.address)
        await poolFactory.createPool(token3.address)
        poolTKN3 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN3.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")
        let supply = await sparta.totalSupply()
        await sparta.approve(poolTKN3.address, supply, { from: acc0 })
        await sparta.approve(poolTKN3.address, supply, { from: acc1 })
    })
    it("It should deploy TKN4 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token4.address)
        await poolFactory.createPool(token4.address)
        poolTKN4 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN4.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")
        let supply = await sparta.totalSupply()
        await sparta.approve(poolTKN4.address, supply, { from: acc0 })
        await sparta.approve(poolTKN4.address, supply, { from: acc1 })
    })
    it("It should deploy TKN5 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token5.address)
        await poolFactory.createPool(token5.address)
        poolTKN5 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN5.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")
        let supply = await sparta.totalSupply()
        await sparta.approve(poolTKN5.address, supply, { from: acc0 })
        await sparta.approve(poolTKN5.address, supply, { from: acc1 })
    })

}
async function addLiquidityBNB(acc, b, t) {
    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = _.BNB
        let tx = await router.addLiquidity(b, t, token, { from: acc, value: t})
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

}
async function curatePools() {
    it("Curate POOls", async () => {
        await poolFactory.addCuratedPool(_.BNB);
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
        await synthBNB.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthBNB.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthBNB.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc2 })
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
        await synthTKN2.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthTKN2.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthTKN2.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc2 })
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
        await synthTKN3.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthTKN3.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthTKN3.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc2 })
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
        await synthTKN4.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthTKN4.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthTKN4.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc2 })
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
        await synthTKN5.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthTKN5.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthTKN5.approve(synthVault.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function swapLayer1ToSynth(acc, x) {
    it("Swap SPARTA to BNB-SPS ", async () => {
        let synthOUT = synthBNB.address;
        let tokenIN = sparta.address
        await router.swapAssetToSynth(x,tokenIN,synthOUT,{from:acc});
    })
    it("Swap BNB to TKN2-SPS ", async () => {
        let synthOUT = synthTKN2.address;
        let tokenIN = _.BNB
        await router.swapAssetToSynth(x,tokenIN,synthOUT,{from:acc,value:x});
    })
    it("Swap TKN1 to TKN3-SPS ", async () => {
        let tokenIN = token1.address
        let synthOUT = synthTKN3.address;
        await router.swapAssetToSynth(x,tokenIN,synthOUT,{from:acc});
    })
    it("Swap SPARTA to TKN4-SPS ", async () => {
        let synthOUT = synthTKN4.address;
        await router.swapAssetToSynth(x,sparta.address,synthOUT,{from:acc});
    })
    it("Swap SPARTA to TKN5-SPS ", async () => {
        let synthOUT = synthTKN5.address;
        await router.swapAssetToSynth(x,sparta.address,synthOUT,{from:acc});
    })
}
async function swapSynthToLayer1(acc, x) {
    it("Swap BNB-SPS to SPARTA   ", async () => {
        let synthIN = synthBNB.address;
        let tokenOut = sparta.address
        await router.swapSynthToAsset(x,synthIN,tokenOut,{from:acc});
    })
    it("Swap TKN2-SPS to BNB", async () => {
        let synthIN = synthBNB.address;
        let tokenOut = _.BNB
        await router.swapSynthToAsset(x,synthIN,tokenOut,{from:acc});
    })
    it("Swap TKN3-SPS to TKN ", async () => {
        let synthIN = synthBNB.address;
        let tokenOut = token1.address
        await router.swapSynthToAsset(x,synthIN,tokenOut,{from:acc});
    })
}
async function depositSynthBNB(acc) {
    it("Deposit Synth into Vault ", async () => {
        
        let synth = synthBNB.address;
       
        let synthBal = _.getBN(await synthBNB.balanceOf(acc));
        let sVStart = _.getBN(await synthBNB.balanceOf(synthVault.address));
        let x = synthBal;
        let memberDeposits = _.getBN(await synthVault.getMemberDeposit(synth, acc))
        
        let memberWeight = _.getBN(await synthVault.getMemberWeight(acc))
        let memberTime = _.BN2Str(await synthVault.getMemberLastTime( acc))

        let token = await synthBNB.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)
        // console.log("x ", x);
        // console.log("memberDeposits ", _.BN2Str(memberDeposits));

        let weight = (_.getBN(x).times(X)).div(Y);
         
        await synthVault.deposit(synth,x,{from:acc});
        
        let synthBalA = _.getBN(await synthBNB.balanceOf(acc))
        let sVStartA = _.getBN(await synthBNB.balanceOf(synthVault.address));

        let memberWeightA = _.BN2Str(await synthVault.getMemberWeight(acc))
        let memberTimeA = _.BN2Str(await synthVault.getMemberLastTime(acc))
        let memberDepositsA = _.getBN(await synthVault.getMemberDeposit(synth, acc))

        assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.minus(x)));
        assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.plus(x)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposits.plus(x)));
        assert.exists(_.BN2Str(memberTimeA));
    })
}
async function depositSynthTKN2(acc) {
    it("Deposit Synth into Vault ", async () => {
        
        let synth = synthTKN2.address;
        let synthBal = _.getBN(await synthTKN2.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN2.balanceOf(synthVault.address));
        let x = synthBal;
        let memberDeposits = _.getBN(await synthVault.getMemberDeposit(synth, acc))
        
        let memberWeight = _.getBN(await synthVault.getMemberWeight(acc))
        let memberTime = _.BN2Str(await synthVault.getMemberLastTime( acc))

        let token = await synthTKN2.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)
        // console.log("x ", x);
        // console.log("memberDeposits ", _.BN2Str(memberDeposits));

        let weight = (_.getBN(x).times(X)).div(Y);
         
        await synthVault.deposit(synth,x,{from:acc});
        
        let synthBalA = _.getBN(await synthTKN2.balanceOf(acc))
        let sVStartA = _.getBN(await synthTKN2.balanceOf(synthVault.address));

        let memberWeightA = _.BN2Str(await synthVault.getMemberWeight(acc))
        let memberTimeA = _.BN2Str(await synthVault.getMemberLastTime(acc))
        let memberDepositsA = _.getBN(await synthVault.getMemberDeposit(synth, acc))

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
        let sVStart = _.getBN(await synthTKN3.balanceOf(synthVault.address));

        let memberDeposits = _.getBN(await synthVault.getMemberDeposit(synth, acc))
        
        let memberWeight = _.getBN(await synthVault.getMemberWeight(acc))
        let memberTime = _.BN2Str(await synthVault.getMemberLastTime( acc))

        let token = await synthTKN3.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)
        // console.log("x ", x);
        // console.log("memberDeposits ", _.BN2Str(memberDeposits));

        let weight = (_.getBN(x).times(X)).div(Y);
         
        await synthVault.deposit(synth,x,{from:acc});
        
        let synthBalA = _.getBN(await synthTKN3.balanceOf(acc))
        let sVStartA = _.getBN(await synthTKN3.balanceOf(synthVault.address));

        let memberWeightA = _.BN2Str(await synthVault.getMemberWeight(acc))
        let memberTimeA = _.BN2Str(await synthVault.getMemberLastTime(acc))
        let memberDepositsA = _.getBN(await synthVault.getMemberDeposit(synth, acc))

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
        let sVStart = _.getBN(await synthTKN4.balanceOf(synthVault.address));

        let memberDeposits = _.getBN(await synthVault.getMemberDeposit(synth, acc))
        
        let memberWeight = _.getBN(await synthVault.getMemberWeight(acc))
        let memberTime = _.BN2Str(await synthVault.getMemberLastTime( acc))

        let token = await synthTKN4.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)
        // console.log("x ", x);
        // console.log("memberDeposits ", _.BN2Str(memberDeposits));

        let weight = (_.getBN(x).times(X)).div(Y);
         
        await synthVault.deposit(synth,x,{from:acc});
        
        let synthBalA = _.getBN(await synthTKN4.balanceOf(acc))
        let sVStartA = _.getBN(await synthTKN4.balanceOf(synthVault.address));

        let memberWeightA = _.BN2Str(await synthVault.getMemberWeight(acc))
        let memberTimeA = _.BN2Str(await synthVault.getMemberLastTime(acc))
        let memberDepositsA = _.getBN(await synthVault.getMemberDeposit(synth, acc))

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
        let sVStart = _.getBN(await synthTKN5.balanceOf(synthVault.address));

        let memberDeposits = _.getBN(await synthVault.getMemberDeposit(synth, acc))
        
        let memberWeight = _.getBN(await synthVault.getMemberWeight(acc))
        let memberTime = _.BN2Str(await synthVault.getMemberLastTime( acc))

        let token = await synthTKN5.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)
        // console.log("x ", x);
        // console.log("memberDeposits ", _.BN2Str(memberDeposits));

        let weight = (_.getBN(x).times(X)).div(Y);
         
        await synthVault.deposit(synth,x,{from:acc});
        
        let synthBalA = _.getBN(await synthTKN5.balanceOf(acc))
        let sVStartA = _.getBN(await synthTKN5.balanceOf(synthVault.address));

        let memberWeightA = _.BN2Str(await synthVault.getMemberWeight(acc))
        let memberTimeA = _.BN2Str(await synthVault.getMemberLastTime(acc))
        let memberDepositsA = _.getBN(await synthVault.getMemberDeposit(synth, acc))

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
        // await sleep(5000);

        // let SPReserveBal = _.getBN(await sparta.balanceOf(reserve.address));
        
        // let memberWeight = _.getBN(await synthVault.getMemberWeight(acc))
        // let memberTime = _.getBN(await synthVault.getMemberLastTime(acc))
        // let totalWeight = _.getBN(await synthVault.totalWeight())
 
        // // console.log("totalWeight ",_.BN2Str(totalWeight))   
        // // console.log("memberWeight ",_.BN2Str(memberWeight)) 

        // now = _.getBN((new Date())/1000).plus(61)
       

        // let secondsPast = _.BN2Str(now.minus(memberTime));
        // // console.log("Seconds Past ",_.BN2Str(secondsPast));

        // let reserveSP = _.getBN(SPReserveBal).div(30);
        // let vaultClaim =  reserveSP.times(1000).div(10000)
        // let share = _.BN2Str(memberWeight.times(vaultClaim).div(totalWeight))
        // let reward = _.BN2Str(_.getBN(share).times(secondsPast).div(_.getBN(86400)));
        // let asymAdd = _.getBN(await utils.calcLiquidityUnitsAsym(reward, poolWBNB.address))
       

        await synthVault.harvestSingle(synth, {from:acc});
        // let token = await synthBNB.LayerONE();
        // let poolTO = await utils.getPoolData(token);
        // const X = _.getBN(poolTO.baseAmount)
        // const Y = _.getBN(poolTO.tokenAmount)
        // let synthMint = _.getBN(await utils.calcAsymmetricValueToken(poolWBNB.address,asymAdd));

        // let weightAdded = (_.getBN(synthMint).times(X)).div(Y);
       
        
        // //  console.log("now ",_.BN2Str(now))   
        // //   console.log("secondsPast ",_.BN2Str(secondsPast))  
        // //   console.log("reward ",_.BN2Str(reward))    

        // let memberTimeA = _.getBN(await synthVault.getMemberLastTime(acc))
        // let memberWeightA = _.BN2Str(await synthVault.getMemberWeight(acc))
        // let totalWeightA = _.BN2Str(await synthVault.totalWeight())
        // assert.exists(_.BN2Str(memberTimeA.minus(now)))
        // assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weightAdded)));
        // assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.plus(weightAdded)));
        


    })
    it("Harvest rewards ACC2", async () => {
        let synth = synthBNB.address;
        let acc = acc2;
        await sleep(5000);

        // let SPReserveBal = _.getBN(await sparta.balanceOf(SPReserve.address));
        
        // let memberWeight = _.getBN(await synthVault.getMemberWeight(acc))
        // let memberTime = _.getBN(await synthVault.getMemberLastTime( acc))
        // let totalWeight = _.getBN(await synthVault.totalWeight())
 
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
       

        await synthVault.harvestAll({from:acc});
        // let token = await synthBNB.LayerONE();
        // let poolTO = await utils.getPoolData(token);
        // const X = _.getBN(poolTO.baseAmount)
        // const Y = _.getBN(poolTO.tokenAmount)
        // let synthMint = _.getBN(await utils.calcAsymmetricValueToken(poolWBNB.address,asymAdd));

        // let weightAdded = (_.getBN(synthMint).times(X)).div(Y);
       
        
        // //  console.log("now ",_.BN2Str(now))   
        // //   console.log("secondsPast ",_.BN2Str(secondsPast))  
        // //   console.log("reward ",_.BN2Str(reward))    

        // let memberTimeA = _.getBN(await synthVault.getMemberLastTime( acc))
        // let memberWeightA = _.BN2Str(await synthVault.getMemberWeight(acc))
        // let totalWeightA = _.BN2Str(await synthVault.totalWeight())
        // assert.exists(_.BN2Str(memberTimeA.minus(now)))
        // assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weightAdded)));
        // assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.plus(weightAdded)));
    })
    it("Harvest rewards ACC1", async () => {
        let synth = synthBNB.address;
        let acc = acc1;
         await sleep(5000);

        // let SPReserveBal = _.getBN(await sparta.balanceOf(SPReserve.address));
        
        // let memberWeight = _.getBN(await synthVault.getMemberWeight(acc))
        // let memberTime = _.getBN(await synthVault.getMemberLastTime( acc))
        // let totalWeight = _.getBN(await synthVault.totalWeight())
 
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
       

        await synthVault.harvestAll({from:acc});
        // let token = await synthBNB.LayerONE();
        // let poolTO = await utils.getPoolData(token);
        // const X = _.getBN(poolTO.baseAmount)
        // const Y = _.getBN(poolTO.tokenAmount)
        // let synthMint = _.getBN(await utils.calcAsymmetricValueToken(poolWBNB.address,asymAdd));

        // let weightAdded = (_.getBN(synthMint).times(X)).div(Y);
       
        
        // //  console.log("now ",_.BN2Str(now))   
        // //   console.log("secondsPast ",_.BN2Str(secondsPast))  
        // //   console.log("reward ",_.BN2Str(reward))    

        // let memberTimeA = _.getBN(await synthVault.getMemberLastTime( acc))
        // let memberWeightA = _.BN2Str(await synthVault.getMemberWeight(acc))
        // let totalWeightA = _.BN2Str(await synthVault.totalWeight())
        // assert.exists(_.BN2Str(memberTimeA.minus(now)))
        // assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weightAdded)));
        // assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.plus(weightAdded)));
        

    })
}
async function Withdraw(bp, acc) {
    it("Withdraw synths + rewards", async () => {
        let synth = synthBNB.address;

        let synthBal = _.getBN(await synthBNB.balanceOf(acc));
        let sVStart = _.getBN(await synthBNB.balanceOf(synthVault.address));
        let memberDeposit = _.getBN(await synthVault.getMemberDeposit(synth, acc))
        let memberTotalWeight = _.getBN(await synthVault.getMemberWeight(acc))
        let SPReserveBal = _.getBN(await sparta.balanceOf(reserve.address));

        let memberSynthWeight = _.getBN(await synthVault.getMemberSynthWeight(synth,acc))
        let totalWeight = _.getBN(await synthVault.totalWeight())
    
        let memberWeightRem = _.BN2Str(memberSynthWeight.times(bp).div(10000));
        let memberDeposits = _.BN2Str(memberDeposit.times(bp).div(10000));


        await synthVault.withdraw(synth, bp,{from:acc});
    
        let synthBalA = _.getBN(await synthBNB.balanceOf(acc));
        let sVStartA = _.getBN(await synthBNB.balanceOf(synthVault.address));
        
        let SPReserveBalA = _.getBN(await sparta.balanceOf(reserve.address));
        
        let memberSynthWeightA = _.getBN(await synthVault.getMemberSynthWeight(synth,acc))
        let memberTotalWeightA = _.getBN(await synthVault.getMemberWeight(acc))
        let memberTimeA = _.getBN(await synthVault.getMemberLastTime(acc))
        let totalWeightA = _.getBN(await synthVault.totalWeight())
        let memberDepositsA = _.getBN(await synthVault.getMemberDeposit(synth, acc))

         assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.plus(memberDeposits)));
         assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.minus(memberDeposits)));
    
         assert.equal(_.BN2Str(memberSynthWeightA), _.BN2Str(memberSynthWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberTotalWeightA), _.BN2Str(memberTotalWeight.minus(memberWeightRem)));
         assert.exists(_.BN2Str(memberTimeA));
         assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposit.minus(memberDeposits)));
    })
}
async function WithdrawTKN2(bp, acc) {
    it("Withdraw synths + rewards", async () => {
        let synth = synthTKN2.address;

        let synthBal = _.getBN(await synthTKN2.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN2.balanceOf(synthVault.address));
        let memberTotalWeight = _.getBN(await synthVault.getMemberWeight(acc))
        let SPReserveBal = _.getBN(await sparta.balanceOf(reserve.address));
        let memberDeposit = _.getBN(await synthVault.getMemberDeposit(synth, acc))

        let memberSynthWeight = _.getBN(await synthVault.getMemberSynthWeight(synth,acc))
        let totalWeight = _.getBN(await synthVault.totalWeight())
    
        let memberWeightRem = _.BN2Str(memberSynthWeight.times(bp).div(10000));
        let memberDeposits = _.BN2Str(memberDeposit.times(bp).div(10000));


        await synthVault.withdraw(synth, bp,{from:acc});
    
        let synthBalA = _.getBN(await synthTKN2.balanceOf(acc));
        let sVStartA = _.getBN(await synthTKN2.balanceOf(synthVault.address));
        
        let SPReserveBalA = _.getBN(await sparta.balanceOf(reserve.address));
        
        let memberSynthWeightA = _.getBN(await synthVault.getMemberSynthWeight(synth,acc))
        let memberTotalWeightA = _.getBN(await synthVault.getMemberWeight(acc))
        let memberTimeA = _.getBN(await synthVault.getMemberLastTime(acc))
        let totalWeightA = _.getBN(await synthVault.totalWeight())
        let memberDepositsA = _.getBN(await synthVault.getMemberDeposit(synth, acc))

         assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.plus(memberDeposits)));
         assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.minus(memberDeposits)));
    
        
         assert.equal(_.BN2Str(memberSynthWeightA), _.BN2Str(memberSynthWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberTotalWeightA), _.BN2Str(memberTotalWeight.minus(memberWeightRem)));
         assert.exists(_.BN2Str(memberTimeA));
         assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposit.minus(memberDeposits)));
    })
}
async function WithdrawTKN3(bp, acc) {
    it("Withdraw synths + rewards", async () => {
        let synth = synthTKN3.address;

        let synthBal = _.getBN(await synthTKN3.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN3.balanceOf(synthVault.address));
        let memberTotalWeight = _.getBN(await synthVault.getMemberWeight(acc))
        let SPReserveBal = _.getBN(await sparta.balanceOf(reserve.address));
        let memberDeposit = _.getBN(await synthVault.getMemberDeposit(synth, acc))

        let memberSynthWeight = _.getBN(await synthVault.getMemberSynthWeight(synth,acc))
        let totalWeight = _.getBN(await synthVault.totalWeight())
    
        let memberWeightRem = _.BN2Str(memberSynthWeight.times(bp).div(10000));
        let memberDeposits = _.BN2Str(memberDeposit.times(bp).div(10000));


        await synthVault.withdraw(synth, bp,{from:acc});
    
        let synthBalA = _.getBN(await synthTKN3.balanceOf(acc));
        let sVStartA = _.getBN(await synthTKN3.balanceOf(synthVault.address));
        
        let SPReserveBalA = _.getBN(await sparta.balanceOf(reserve.address));
        
         
        let memberSynthWeightA = _.getBN(await synthVault.getMemberSynthWeight(synth,acc))
        let memberTotalWeightA = _.getBN(await synthVault.getMemberWeight(acc))
        let memberTimeA = _.getBN(await synthVault.getMemberLastTime(acc))
        let totalWeightA = _.getBN(await synthVault.totalWeight())
        let memberDepositsA = _.getBN(await synthVault.getMemberDeposit(synth, acc))

         assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.plus(memberDeposits)));
         assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.minus(memberDeposits)));
    
         assert.equal(_.BN2Str(memberSynthWeightA), _.BN2Str(memberSynthWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberTotalWeightA), _.BN2Str(memberTotalWeight.minus(memberWeightRem)));
         assert.exists(_.BN2Str(memberTimeA));
         assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposit.minus(memberDeposits)));
    })
}
async function WithdrawTKN4(bp, acc) {
    it("Withdraw synths + rewards", async () => {
        let synth = synthTKN4.address;

        let synthBal = _.getBN(await synthTKN4.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN4.balanceOf(synthVault.address));
        let memberTotalWeight = _.getBN(await synthVault.getMemberWeight(acc))
        let SPReserveBal = _.getBN(await sparta.balanceOf(reserve.address));

        let memberSynthWeight = _.getBN(await synthVault.getMemberSynthWeight(synth,acc))
        let totalWeight = _.getBN(await synthVault.totalWeight())
    
        let memberWeightRem = _.BN2Str(memberWeight.times(bp).div(10000));
        let memberDeposits = _.BN2Str(memberDeposit.times(bp).div(10000));


        await synthVault.withdraw(synth, bp,{from:acc});
    
        let synthBalA = _.getBN(await synthTKN4.balanceOf(acc));
        let sVStartA = _.getBN(await synthTKN4.balanceOf(synthVault.address));
        
        let SPReserveBalA = _.getBN(await sparta.balanceOf(reserve.address));
        
        let memberSynthWeightA = _.getBN(await synthVault.getMemberSynthWeight(synth,acc))
        let memberTotalWeightA = _.getBN(await synthVault.getMemberWeight(acc))
        let memberTimeA = _.getBN(await synthVault.getMemberLastTime(acc))
        let totalWeightA = _.getBN(await synthVault.totalWeight())
        let memberDepositsA = _.getBN(await synthVault.getMemberDeposit(synth, acc))

         assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.plus(memberDeposits)));
         assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.minus(memberDeposits)));
    
         assert.equal(_.BN2Str(memberSynthWeightA), _.BN2Str(memberSynthWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberTotalWeightA), _.BN2Str(memberTotalWeight.minus(memberWeightRem)));
         assert.exists(_.BN2Str(memberTimeA));
         assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposit.minus(memberDeposits)));
    })
}
async function WithdrawTKN5(bp, acc) {
    it("Withdraw synths + rewards", async () => {
        let synth = synthTKN5.address;

        let synthBal = _.getBN(await synthTKN5.balanceOf(acc));
        let sVStart = _.getBN(await synthTKN5.balanceOf(synthVault.address));
        let memberDeposit = _.getBN(await synthVault.getMemberDeposit(synth, acc))
        let SPReserveBal = _.getBN(await sparta.balanceOf(reserve.address));

        let memberWeight = _.getBN(await synthVault.getMemberWeight(acc))
        let totalWeight = _.getBN(await synthVault.totalWeight())
    
        let memberWeightRem = _.BN2Str(memberWeight.times(bp).div(10000));
        let memberDeposits = _.BN2Str(memberDeposit.times(bp).div(10000));


        await synthVault.withdraw(synth, bp,{from:acc});
    
        let synthBalA = _.getBN(await synthTKN5.balanceOf(acc));
        let sVStartA = _.getBN(await synthTKN5.balanceOf(synthVault.address));
        
        let SPReserveBalA = _.getBN(await sparta.balanceOf(reserve.address));
        
        let memberWeightA = _.getBN(await synthVault.getMemberWeight(acc))
        let memberTimeA = _.getBN(await synthVault.getMemberLastTime(acc))
        let totalWeightA = _.getBN(await synthVault.totalWeight())
        let memberDepositsA = _.getBN(await synthVault.getMemberDeposit(synth, acc))

         assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.plus(memberDeposits)));
         assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.minus(memberDeposits)));
    
         assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.minus(memberWeightRem)));
         assert.exists(_.BN2Str(memberTimeA));
         assert.equal(_.BN2Str(totalWeightA), _.BN2Str(totalWeight.minus(memberWeightRem)));
         assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposit.minus(memberDeposits)));
    })
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

async function realise() {
    it("It should realise", async () => {

        let synth = synthBNB.address;

        let pool = poolWBNB.address;
        await synthBNB.realise(pool)
    })
}






