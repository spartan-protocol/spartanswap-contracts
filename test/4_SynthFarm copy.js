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
    createPoolBNB(acc0, 10000, 30)
    createPoolBUSD(acc0, 10000, 10000)
    addLiquidityBNB(acc1, 9)
    addLiquidityBUSD(acc1, 100)
    addLiquidityBNB(acc2, 10)
    addLiquidityBUSD(acc2, 1000)
    curatePools()
    createSyntheticBNB()
    createSyntheticBUSD()
    swapSpartaToSynthBNB(acc1, 200)
    swapBNBToSynthBNB(acc2, 1)
    // withdraw(acc1, 1000) 
    // deposit(acc1);
    harvest(acc1);
   
})

//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        sparta = await SPARTA.new(acc0)         // deploy sparta v2
        Dao = await DAO.new(sparta.address)     // deploy daoV2
        wbnb = await WBNB.new()                 // deploy wBNB 
        utils = await UTILS.new(sparta.address) // deploy utilsV2
        token1 = await TOKEN.new()   
        reserve = await RESERVE.new(sparta.address) // deploy reserve 
        daoVault = await DAOVAULT.new(sparta.address); // deploy daoVault
        bondVault = await BONDVAULT.new(sparta.address); // deploy daoVault
        synthVault = await SYNTHVAULT.new(sparta.address); // deploy daoVault
        router = await ROUTER.new(sparta.address, wbnb.address,); // deploy router
        poolFactory = await POOLFACTORY.new(sparta.address,  wbnb.address) // deploy poolfactory
        synthFactory = await SYNTHFACTORY.new(sparta.address,  wbnb.address) // deploy poolfactory
        await Dao.setGenesisAddresses(router.address,utils.address,reserve.address, utils.address);
        await Dao.setVaultAddresses(daoVault.address,bondVault.address, synthVault.address);
        await Dao.setFactoryAddresses(poolFactory.address,synthFactory.address);
        await Dao.setGenesisFactors(2, 30,6666);
        await Dao.setDaoFactors(1000,400,true, 3);
        await sparta.changeDAO(Dao.address)
     
         
        // await sparta.flipEmissions();  
        await router.flipSynthMinting();
        
        await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await sparta.transfer(reserve.address, _.getBN(_.BN2Str(100000 * _.one)))
        await sparta.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))

        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))

        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await sparta.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await sparta.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await sparta.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await sparta.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token1.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(poolFactory.address, _.BN2Str(500000 * _.one), { from: acc2 })


    });
}
async function createPoolBNB(acc, inputB, inputT) {
    it("It should deploy BNB Pool", async () => {
        let inputBase = _.getBN(inputB * _.one)
        let inputToken = _.getBN(inputT * _.one)
        let token = _.BNB
        var _pool = await poolFactory.createPoolADD.call(inputBase, inputToken, token, {value: inputToken})
        await poolFactory.createPoolADD(inputBase, inputToken, token, {value: inputToken})
        poolBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolBNB.address}`)
        const baseAddr = await poolBNB.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")
        let supply = await sparta.totalSupply()
        await sparta.approve(router.address, supply, { from: acc0 })
        await sparta.approve(router.address, supply, { from: acc1 })

        assert.equal(_.BN2Str(await wbnb.balanceOf(poolBNB.address)), _.BN2Str(inputToken), 'wbnb balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBNB.address)), _.BN2Str(inputBase), 'sparta balance')
        assert.equal(_.BN2Str(await poolBNB.balanceOf(acc0)), _.BN2Str(inputBase.minus(100*10**18)), 'Correct LPS')

    })
}
async function createPoolBUSD(acc, inputB, inputT) {
    it("It should deploy BUSD Pool", async () => {
        let inputBase = _.getBN(inputB * _.one)
        let inputToken = _.getBN(inputT * _.one)
        let token = token1.address
        var _pool = await poolFactory.createPoolADD.call(inputBase, inputToken, token,{from:acc})
        await poolFactory.createPoolADD(inputBase, inputToken, token,{from:acc})
        poolBUSD = await POOL.at(_pool)

        const baseAddr = await poolBUSD.BASE()
        assert.equal(baseAddr, sparta.address, "address is correct")

        let supply = await sparta.totalSupply()
        await sparta.approve(poolBUSD.address, supply, { from: acc0 })
        await sparta.approve(poolBUSD.address, supply, { from: acc1 })

        assert.equal(_.BN2Str(await token1.balanceOf(poolBUSD.address)), _.BN2Str(inputToken), 'BUSD balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(poolBUSD.address)), _.BN2Str(inputBase), 'sparta balance')
        assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(inputBase.minus(100*10**18)), 'Correct LPS')

    })
}
async function curatePools() {
    it("Curate POOls", async () => {
        await poolFactory.addCuratedPool(_.BNB);
        await poolFactory.addCuratedPool(token1.address);
        assert.equal(_.BN2Str(await poolFactory.curatedPoolCount()),'2','Length correct')
    })
}
async function addLiquidityBNB(acc, t) {
    it(`It should addLiquidity BNB`, async () => {
        let token = _.BNB
        let inputToken = _.getBN(t * _.one)
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let b = inputToken.times(B).div(T);
        poolUnits = _.getBN((await poolBNB.totalSupply()))
        let before = _.getBN(await poolBNB.balanceOf(acc))
        let units = math.calcLiquidityUnits(b, B, inputToken, T, poolUnits)
        let tx = await router.addLiquidity(inputToken,b, token, {from: acc, value:inputToken})
         poolData = await utils.getPoolData(token);
         assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
         assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(inputToken)))
         assert.equal(_.BN2Str((await poolBNB.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
         assert.equal(_.BN2Str(await poolBNB.balanceOf(acc)), _.BN2Str(before.plus(units)), 'units')
         assert.equal(_.BN2Str(await sparta.balanceOf(poolBNB.address)), _.BN2Str(B.plus(b)), 'sparta balance')
         assert.equal(_.BN2Str(await wbnb.balanceOf(poolBNB.address)), _.BN2Str(T.plus(inputToken)), 'wbnb balance')
    })
}
async function addLiquidityBUSD(acc, t) {
    it(`It should addLiquidity BUSD `, async () => {
        let token = token1.address
        let inputToken = _.getBN(t * _.one)
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        let b = inputToken.times(B).div(T);
        poolUnits = _.getBN((await poolBUSD.totalSupply()))
        let before = _.getBN(await poolBUSD.balanceOf(acc))
        let units = math.calcLiquidityUnits(b, B, inputToken, T, poolUnits)
        let tx = await router.addLiquidity(inputToken,b, token, {from: acc})
         poolData = await utils.getPoolData(token);
         assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))
         assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.plus(inputToken)))
         assert.equal(_.BN2Str((await poolBUSD.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
         assert.equal(_.BN2Str(await poolBUSD.balanceOf(acc)), _.BN2Str(before.plus(units)), 'units')
         assert.equal(_.BN2Str(await sparta.balanceOf(poolBUSD.address)), _.BN2Str(B.plus(b)), 'sparta balance')
         assert.equal(_.BN2Str(await token1.balanceOf(poolBUSD.address)), _.BN2Str(T.plus(inputToken)), 'wbnb balance')
    })
}
async function createSyntheticBNB() {
    it("It should Create Synthetic BNB ", async () => {
        let token = _.BNB
        var _synth =  await synthFactory.createSynth.call(token);
        await synthFactory.createSynth(token);
        synthBNB = await SYNTH.at(_synth)
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        assert.equal(_.BN2Str(await synthFactory.synthCount()), 1, 'length')
        // console.log("Symbol: ",await synthBNB.symbol());
        //  console.log("Name: ",await synthBNB.name());
    })
}
async function createSyntheticBUSD() {
    it("It should Create Synthetic BUSD ", async () => {
        let token = token1.address
        var _synth =  await synthFactory.createSynth.call(token);
        await synthFactory.createSynth(token);
        synthBUSD = await SYNTH.at(_synth)
        await synthBUSD.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthBUSD.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthBUSD.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        assert.equal(_.BN2Str(await synthFactory.synthCount()), 2, 'length')
        // console.log("Symbol: ",await synthBUSD.symbol());
        //  console.log("Name: ",await synthBUSD.name());
    })
}
async function swapSpartaToSynthBNB(acc, xx) {
    it("Swap BASE to Synthetic BNB", async () => {
        let x = _.getBN(xx * _.oneBN)
        let fromToken = sparta.address
        let toSynth = synthBNB.address
        let token = _.BNB;
        let synBal = _.getBN(await synthBNB.balanceOf(synthVault.address));
        let basBal = _.getBN(await sparta.balanceOf(acc));
        let basBalPool = _.getBN(await sparta.balanceOf(poolBNB.address));
        let bAA =_.getBN( await poolBNB.baseAmount());
        let poolData = await utils.getPoolData(token);
        let lpBalance = _.getBN(await synthBNB.collateral());
        let lpDebt =_.getBN( await synthBNB.totalSupply());
        const X = _.getBN(poolData.baseAmount)
        const Y = _.getBN(poolData.tokenAmount)
        let asymAdd = _.getBN(await utils.calcLiquidityUnitsAsym(x, poolBNB.address))
        let poolSynBal = _.getBN(await poolBNB.balanceOf(synthBNB.address));
        let totalSynths = _.getBN(await synthBNB.totalSupply());
        await router.swapAssetToSynth(x, fromToken, toSynth, {from:acc});
    })
}
async function swapBNBToSynthBNB(acc, xx) {
    it("Swap BNB to Synthetic BNB", async () => {
        let x = _.getBN(xx * _.oneBN)
        let fromToken = _.BNB;
        let toSynth = synthBNB.address
        let token = _.BNB;
        let synBal = _.getBN(await synthBNB.balanceOf(synthVault.address));
        let depositMember = _.getBN(await synthVault.getMemberDeposit(acc,synthBNB.address))
        let depositTotal = _.getBN(await synthVault.getTotalDeposit(synthBNB.address))
        let poolData = await utils.getPoolData(token);
        let lpBalance = _.getBN(await synthBNB.collateral());
        let lpDebt =_.getBN( await synthBNB.totalSupply());
        let totalS = _.getBN(await poolBNB.totalSupply())
        const X = _.getBN(poolData.baseAmount)
        const Y = _.getBN(poolData.tokenAmount)
        let baseIN = math.calcSwapOutput(x, Y, X)
        let asymAdd = totalS.times(baseIN).div((X).times("2"))
        let poolSynBal = _.getBN(await poolBNB.balanceOf(synthBNB.address));
        let totalSynths = _.getBN(await synthBNB.totalSupply());
        await sleep(8000)
        await router.swapAssetToSynth(x, fromToken, toSynth, {from:acc, value:x});
      })
}
async function withdraw(acc, xx) {
    it("withdraw from synthVault", async () => {
        let bp = _.getBN(xx);
        let synth = synthBNB.address
        let depositMember = _.getBN(await synthVault.getMemberDeposit(acc,synthBNB.address))
        let depositTotal = _.getBN(await synthVault.getTotalDeposit(synthBNB.address))
        let removedAmount = _.getBN(await utils.calcPart(bp, depositMember));

        await synthVault.withdraw(synth, bp, {from:acc})

        let depositMemberA = _.getBN(await synthVault.getMemberDeposit(acc,synthBNB.address))
        let depositTotalA = _.getBN(await synthVault.getTotalDeposit(synthBNB.address))

        assert.equal(_.BN2Str(depositMemberA),_.BN2Str(depositMember.minus(removedAmount)) )
        assert.equal(_.BN2Str(depositTotalA),_.BN2Str(depositTotal.minus(removedAmount)) )
        
    })
}
async function deposit(acc) {
    it("deposit to synthVault", async () => {
        let amount = _.getBN(await synthBNB.balanceOf(acc))
        let synth = synthBNB.address
        let depositMember = _.getBN(await synthVault.getMemberDeposit(acc,synthBNB.address))
        let depositTotal = _.getBN(await synthVault.getTotalDeposit(synthBNB.address))

        await synthBNB.approve(synthVault.address, _.BN2Str(1000000*10**18), {from:acc});
        await synthVault.deposit(synth, amount, {from:acc})
        let amountA = _.getBN(await synthBNB.balanceOf(acc))
        let depositMemberA = _.getBN(await synthVault.getMemberDeposit(acc,synthBNB.address))
        let depositTotalA = _.getBN(await synthVault.getTotalDeposit(synthBNB.address))

        assert.equal(_.BN2Str(depositMemberA),_.BN2Str(depositMember.plus(amount)) )
        assert.equal(_.BN2Str(depositTotalA),_.BN2Str(depositTotal.plus(amount)) )
        assert.equal(_.BN2Str(amountA),_.BN2Str(0) )
        
    })
}
async function harvest(acc) {
    it("Harvest rewards from synthVault", async () => {
        await sleep(3000)
        let synth = synthBNB.address
        await reserve.flipEmissions();   
        await synthVault.harvestSingle(synth, {from:acc})
        
    })
}







