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
var TOKEN2 = artifacts.require("./Token2.sol");
var POOLFACTORY = artifacts.require("./poolFactory.sol");
var SYNTHFACTORY = artifacts.require("./synthFactory.sol");
var WBNB = artifacts.require("./WBNB");
var DAOVAULT = artifacts.require("./DaoVault.sol");
var UPGR = artifacts.require("./SPARTANUPGRADE.sol");

var base; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1; var synthTNK2; var synthBNB;
var acc0; var acc1; var acc2; var acc3;
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
     swapLayer1ToSynth(acc0,_.BN2Str(500*_.one))
     depositSynth(acc0, _.BN2Str(0.2*_.one))
     swapLayer1ToSynth(acc2,_.BN2Str(1000*_.one))
     depositSynth(acc2, _.BN2Str(0.5*_.one))
     swapLayer1ToSynth(acc1,_.BN2Str(500*_.one))
     depositSynth(acc1, _.BN2Str(0.3*_.one))
     harvestSynth()

   
})

//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("Constructor events", async () => {
        base = await BASE.new() // deploy base
        wbnb = await WBNB.new() // deploy wBNB
        token1 = await TOKEN.new()             //deploy token
        synthV = await SYNTHVAULT.new(base.address) 
        Dao = await DAO.new(base.address)     // deploy daoV2
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

        await SPReserve.setIncentiveAddresses(router.address, lend.address,utils.address);
        await SPReserve.start();

        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
       
         await base.transfer(SPReserve.address, _.getBN(_.BN2Str(1000000 * _.one)))
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token1.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
      

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
}
async function addLiquidityBNB(acc, b, t) {
    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = wbnb.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function addLiquidityTKN1(acc, b, t) {
    it(`It should addLiquidity TKN2 from ${acc}`, async () => {
        let token = token1.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function curatePools() {
    it("Curate POOls", async () => {
        await poolFactory.addCuratedPool(wbnb.address);
        await poolFactory.addCuratedPool(token1.address);
    })
}
async function createSyntheticBNB() {
    it("It should Create Synthetic BNB ", async () => {
        var _synth =  await synthFactory.createSynth.call(wbnb.address);
        await synthFactory.createSynth(wbnb.address);
        synthBNB = await SYNTH.at(_synth)
        let synth = await synthFactory.getSynth(wbnb.address);
        let result = await synthFactory.isSynth(synth);
        assert.equal(result, true);
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function swapLayer1ToSynth(acc, x) {
    it("Swap SPARTA to SP-sBNB ", async () => {
        let synthOUT = synthBNB.address;
        await router.swapBaseToSynth(x,synthOUT,{from:acc});

        

    })
}
async function depositSynth(acc, x) {
    it("Deposit Synth into Vault ", async () => {
        let synth = synthBNB.address;
        let synthBal = _.getBN(await synthBNB.balanceOf(acc));
        let sVStart = _.getBN(await synthBNB.balanceOf(synthV.address));
        let tokenDeposits = _.getBN(await synthV.getTokenDeposits(synth))
        let memberDeposits = _.getBN(await synthV.getMemberDeposit(synth, acc))
        let memberReward = _.BN2Str(await synthV.getMemberReward(synth, acc))
        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let memberTime = _.BN2Str(await synthV.getMemberLastTime(synth, acc))

        let token = await synthBNB.LayerONE();
        let poolTO = await utils.getPoolData(token);
        const X = _.getBN(poolTO.baseAmount)
        const Y = _.getBN(poolTO.tokenAmount)

        let weight = (_.getBN(x).times(X)).div(Y);
       
        await synthV.deposit(synth,x,{from:acc});
        
        let synthBalA = _.getBN(await synthBNB.balanceOf(acc))
        let sVStartA = _.getBN(await synthBNB.balanceOf(synthV.address));
        let tokenDepositsA = _.BN2Str(await synthV.getTokenDeposits(synth))
        let memberDepositsA = _.BN2Str(await synthV.getMemberDeposit(synth, acc))
        // let memberRewardA = _.BN2Str(await synthV.getMemberReward(synth, acc))
        let memberWeightA = _.BN2Str(await synthV.getMemberWeight(acc))
        let memberTimeA = _.BN2Str(await synthV.getMemberLastTime(synth, acc))

        assert.equal(_.BN2Str(synthBalA), _.BN2Str(synthBal.minus(x)));
        assert.equal(_.BN2Str(sVStartA), _.BN2Str(sVStart.plus(x)));
        assert.equal(_.BN2Str(tokenDepositsA), _.BN2Str(tokenDeposits.plus(x)));
        assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(x));
        assert.equal(_.BN2Str(memberDepositsA), _.BN2Str(memberDeposits.plus(x)));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(weight));
        assert.equal(_.BN2Str(memberWeightA), _.BN2Str(memberWeight.plus(weight)));
        assert.exists(_.BN2Str(memberTimeA));

        

    })
}
async function harvestSynth() {
    it("Harvest rewards", async () => {
        let synth = synthBNB.address;
        let acc = acc0;
        await sleep(10000);

        let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));
        
        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let memberDeposits = _.getBN(await synthV.getMemberDeposit(synth, acc))
        let memberTime = _.BN2Str(await synthV.getMemberLastTime(synth, acc))
        let totalWeight = _.getBN(await synthV.totalWeight())
        console.log("totalWeight ",_.BN2Str(totalWeight))   
        console.log("memberWeight ",_.BN2Str(memberWeight))   

        let secondsPast = 14;
        let reserve = _.getBN(SPReserveBal).div(30);
        console.log("reserve ",_.BN2Str(reserve))
        let vaultClaim =  reserve.times(1000).div(10000)
        console.log("vaultClaim ",_.BN2Str(vaultClaim))
        let share = (memberWeight.times(vaultClaim)).div(totalWeight)
        console.log("share ",_.BN2Str(share))
        let reward = (share.times(secondsPast).div(1));
        
        console.log("reward ",_.BN2Str(reward)/_.one)
    
        await synthV.harvest(synth,{from:acc});
        let memberReward = _.BN2Str(await synthV.getMemberReward(synth, acc))
        console.log("memberReward ",_.BN2Str(memberReward)/_.one)
        

    })
    it("Harvest rewards", async () => {
        let synth = synthBNB.address;
        await sleep(10000);
        let acc = acc1;
        let SPReserveBal = _.getBN(await base.balanceOf(SPReserve.address));
        
        let memberWeight = _.getBN(await synthV.getMemberWeight(acc))
        let memberDeposits = _.getBN(await synthV.getMemberDeposit(synth, acc))
        let memberTime = _.BN2Str(await synthV.getMemberLastTime(synth, acc))
        let totalWeight = _.getBN(await synthV.totalWeight())
        console.log("totalWeight ",_.BN2Str(totalWeight))   
        console.log("memberWeight ",_.BN2Str(memberWeight))   

        let secondsPast = 20;
        let reserve = _.getBN(SPReserveBal).div(30);
        console.log("reserve ",_.BN2Str(reserve))
        let vaultClaim =  reserve.times(1000).div(10000)
        console.log("vaultClaim ",_.BN2Str(vaultClaim))
        let share = (memberWeight.times(vaultClaim)).div(totalWeight)
        console.log("share ",_.BN2Str(share))
        let reward = (share.times(secondsPast).div(1));
        console.log("reward ",_.BN2Str(reward)/_.one)

        await synthV.harvest(synth,{from:acc});
        let memberReward = _.BN2Str(await synthV.getMemberReward(synth, acc))
        console.log("memberReward ",_.BN2Str(memberReward)/_.one)
        

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






