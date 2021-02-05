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
var LEVERAGE = artifacts.require("./Leverage.sol");

var base; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1; var synthTNK2; var synthBNB;
var acc0; var acc1; var acc2; var acc3;


contract('SynthsLiquidate', function (accounts) {
    constructor(accounts)
    wrapBNB()
    createPoolWBNB(1000*_.one, 100*_.one)
    createPoolTKN1(1000*_.one, 600*_.one)
    createPoolTKN2(4000*_.one, 130*_.one)
    addLiquidityBNB(acc1,_.BN2Str(20*_.one),  _.BN2Str(10*_.one));
    addLiquidityTKN2(acc1,  _.BN2Str(20*_.one),  _.BN2Str(10*_.one))
    addLiquidityTKN1(acc1,  _.BN2Str(20*_.one),  _.BN2Str(10*_.one))
    curatePools()
    createSyntheticBNB()
   
    ShowAddress()
    // ShowBNBPool()
    // ShowAccBal(acc0)
     swapLayer1ToSynth(_.BN2Str(10*_.one))
    // ShowBNBPool()
    // ShowAccBal(acc0)
     //swapSynthToLayer1(_.BN2Str(10*_.one))
    ShowBNBPool()
    ShowAccBal(acc0)

    LeverageUp(acc0)
   
    // addCollateralSPTBNBForSyntheticBNB(acc0, _.BN2Str(100*_.one))
    ShowAccBal(acc0)
    ShowBNBPool()
    Showlptkn2CDPDetails()
    ShowlpBNBCDPDetails()
     ShowGLOBALCDP()
    
    // removeSPTBNBCollateralForSyntheticBNB(acc0, _.BN2Str(1*_.one));
    // Liquidate()
    //  ShowAccBal(acc0)
    // ShowBNBPool()
    // Showlptkn2CDPDetails()
    // ShowlpBNBCDPDetails()
    //  ShowGLOBALCDP()
    // globalSettleMent()
    // ShowAccBal(acc0)
    // ShowBNBPool()
    // Showlptkn2CDPDetails()
    // ShowlpBNBCDPDetails()
    //  ShowGLOBALCDP()
     
    
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
        synthRouter = await synthRouter.new(base.address, wbnb.address) //deploy synthRouter
        bond = await BOND.new(base.address)     //deploy new bond
        token1 = await TOKEN.new()             //deploy token
        token2 = await TOKEN2.new() 
        leverage = await LEVERAGE.new(base.address,wbnb.address );

        await Dao.setGenesisAddresses(router.address, utils.address, synthRouter.address, bond.address, daoVault.address);

        await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await base.transfer(router.address, _.getBN(_.BN2Str(100000 * _.one)))
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await base.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token1.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })

        await token2.transfer(acc0, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.transfer(acc2, _.getBN(_.BN2Str(100000 * _.one)))
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })

    });
}
async function wrapBNB() {
    it("It should wrap", async () => {
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*1000), from:acc0});
        await wbnb.transfer(acc0, _.getBN(_.BN2Int(_.one * 300)))
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 300)))
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one * 300)))
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await wbnb.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
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
        await poolWBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await poolWBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await poolWBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
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
        await poolTKN1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await poolTKN1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await poolTKN1.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })

    })
}
async function createPoolTKN2(SPT, token) {
    it("It should deploy TKN2 Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(SPT), _.BN2Str(token), token2.address)
        await router.createPool(_.BN2Str(SPT), _.BN2Str(token), token2.address)
        poolTKN2 = await POOL.at(_pool)
        const baseAddr = await poolTKN2.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN2.address)), _.BN2Str(SPT), 'base balance')
        assert.equal(_.BN2Str(await token2.balanceOf(poolTKN2.address)), _.BN2Str(token), 'token1 balance')
        
        let supply = await base.totalSupply()
        await base.approve(poolTKN2.address, supply, { from: acc0 })
        await base.approve(poolTKN2.address, supply, { from: acc1 })
        await poolTKN2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await poolTKN2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await poolTKN2.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function addLiquidityBNB(acc, b, t) {
    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = wbnb.address
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function addLiquidityTKN2(acc, b, t) {
    it(`It should addLiquidity TKN2 from ${acc}`, async () => {
        let token = token2.address
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
        await router.addCuratedPool(wbnb.address);
        await router.addCuratedPool(token1.address);
        await router.addCuratedPool(token2.address);
       
    })
}
async function createSyntheticBNB() {
    it("It should Create Synthetic BNB ", async () => {
        let inputLPToken = _.BN2Str(10*_.one)
        let lpToken = poolTKN2.address;
        var _synth =  await synthRouter.createSynth.call(lpToken,wbnb.address, inputLPToken);
        await synthRouter.createSynth(lpToken,wbnb.address,inputLPToken);
        synthBNB = await SYNTH.at(_synth)
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthBNB.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await synthBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await synthBNB.approve(leverage.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await synthBNB.approve(leverage.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await synthBNB.approve(leverage.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function swapSynthToLayer1() {
    it("Swap Synthetic BNB To BASE", async () => {
        let input =  _.BN2Str(2*_.one);
        let synthIN = synthBNB.address;
        await router.swapSynthToBase(input,synthIN);
    })
}
async function swapLayer1ToSynth() {
    it("Swap BASE to Synthetic BNB", async () => {
        let input =  _.BN2Str(10*_.one);
        let synthOUT = synthBNB.address;
        await router.swapBaseToSynth(input,synthOUT);
      
    })
}

async function addCollateralSPTBNBForSyntheticBNB(acc, inputLP) {
    it("It should add SPT1-WBNB collateral for sBNB", async () => {
        let inputLPToken = inputLP
        let lpToken = poolWBNB.address;
        await synthRouter.addCollateral(inputLPToken,lpToken, synthBNB.address,{from:acc});
    })
}


function Liquidate() {
    it("Liquidate", async () => {
    let li = await synthBNB._liquidate(poolWBNB.address);
})
}
function globalSettleMent() {
    it("Perform Global Settlement", async () => {
    await synthRouter.globalSettlement(synthBNB.address);
})
}

async function removeSPTBNBCollateralForSyntheticBNB(acc, inputSynth) {
    it("It should remove SPT1-BNB collateral for sBNB", async () => {
        let syntheticBNB = synthBNB.address
        let lpToken = poolWBNB.address;
        await synthRouter.removeCollateral(inputSynth,lpToken, syntheticBNB, {from:acc})
    })
}

function LeverageUp(acc) {
    it("Leverage Up", async () => {
        let sBNB = _.BN2Str(await synthBNB.balanceOf(acc));
     await leverage.leverageUp(sBNB, synthBNB.address, {from:acc});
})
}

//==========SHOW HELPERS==========
function ShowAccBal(acc) {
    it("Show BALANCES", async () => {
        let acc0S = _.BN2Str(await base.balanceOf(acc));
        let acc0B = _.BN2Str(await poolWBNB.balanceOf(acc));
        let acc0T1 = _.BN2Str(await poolTKN1.balanceOf(acc));
        let acc0T2 = _.BN2Str(await poolTKN2.balanceOf(acc));
        let sBNB = _.BN2Str(await synthBNB.balanceOf(acc));
        console.log('================= BALANCES ==================')
        console.log(`Base  ${acc0S/_.one}`);
        console.log(`SPT1-BNB  ${acc0B/_.one}`);
        console.log(`SPT1-TKN1  ${acc0T1/_.one}`);
        console.log(`SPT1-TKN2  ${acc0T2/_.one}`);
        console.log(`SSTV1-BNB  ${sBNB/_.one}`);
    })
}
function Showlptkn2CDPDetails() {
    it("Show CDP", async () => {
        let totalCol = _.BN2Str(await synthBNB.totalCollateral(poolTKN2.address));
        let totalMinted = _.BN2Str(await synthBNB.totalDebt(poolTKN2.address));
        console.log('================= SPT1-TKN2 CDP ==================')
        console.log(`Collateral  ${totalCol/_.one}`);
        console.log(`Minted   ${totalMinted/_.one}`);
    })
}
function ShowlpBNBCDPDetails() {
    it("Show CDP", async () => {
        let totalCol = _.BN2Str(await synthBNB.totalCollateral(poolWBNB.address));
        let totalMinted = _.BN2Str(await synthBNB.totalDebt(poolWBNB.address));
        console.log('================= SPT1-BNB CDP ==================')
        console.log(`Collateral  ${totalCol/_.one}`);
        console.log(`Minted   ${totalMinted/_.one}`);
    })
}
function ShowBNBPool() {
    it("Show POOls", async () => {
        await poolWBNB.sync();
    let tknA = _.BN2Str(await poolWBNB.tokenAmount());
    let baseA = _.BN2Str(await poolWBNB.baseAmount());
    console.log('================= POOL DEPTH ==================')
    console.log(`SPARTA - ${baseA/_.one}`);
    console.log(`BNB - ${tknA/_.one}`);
})
}
function ShowTKN1Pool() {
    it("Show POOls", async () => {
    let tknA = _.BN2Str(await poolTKN1.tokenAmount());
    let baseA = _.BN2Str(await poolTKN1.baseAmount());
    console.log(`SPARTA - ${baseA/_.one}`);
    console.log(`TKN1 - ${tknA/_.one}`);
})
}
function ShowTKN2Pool() {
    it("Show POOls", async () => {
    let tknA = _.BN2Str(await poolTKN2.tokenAmount());
    let baseA = _.BN2Str(await poolTKN2.baseAmount());
    console.log(`SPARTA - ${baseA/_.one}`);
    console.log(`TKN2 - ${tknA/_.one}`);
})
}
function ShowGLOBALCDP() {
    it("Show DEPT", async () => {
        let totalColl = _.BN2Str(await synthBNB.totalCollateral(poolWBNB.address));
        let totalMinted = _.BN2Str(await synthBNB.totalDebt(poolWBNB.address));
        let baseColl = _.BN2Str(await utils.calcAsymmetricValue(poolWBNB.address, totalColl))
        let baseVal = _.BN2Str(await utils.calcSwapValueInBase(wbnb.address, totalMinted ))
        
        console.log('================= SST1 - SPT1-BNB - CDP =============')
        console.log(`totalDebt   ${totalMinted/_.one}`);
        console.log(`BASEDebt   ${baseVal/_.one}`);
        console.log(`BASECollateral   ${baseColl/_.one}`);

        let totalColl1 = _.BN2Str(await synthBNB.totalCollateral(poolTKN2.address));
        let totalMinted1 = _.BN2Str(await synthBNB.totalDebt(poolTKN2.address));
        let baseColl1 = _.BN2Str(await utils.calcAsymmetricValue(poolTKN2.address, totalColl1))
        let baseVal1 = _.BN2Str(await utils.calcSwapValueInBase(token2.address, totalMinted1 ))
        
        console.log('================= SST1 - SPT1-BNB - CDP =============')
        console.log(`totalDebt   ${totalMinted1/_.one}`);
        console.log(`BASEDebt   ${baseVal1/_.one}`);
        console.log(`BASECollateral   ${baseColl1/_.one}`);

    })
}
function ShowAddress() {
    it("Show Address", async () => {
    console.log(`BASE       ${base.address}`);
    console.log(`SPT1-BNB   ${poolWBNB.address}`);
    console.log(`SPT1-TKN1  ${poolTKN1.address}`);
    console.log(`SPT1-TKN2  ${poolTKN2.address}`);
    console.log(`SST1-BNB  ${synthBNB.address}`);
    console.log(`sRouter    ${synthRouter.address}`);
    console.log(`pRouter    ${router.address}`);
    console.log(`bnb    ${wbnb.address}`);
    console.log(`leverage    ${leverage.address}`);
})
}







