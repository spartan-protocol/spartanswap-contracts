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
var CURATED = artifacts.require("./Curated.sol");

var base; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1; var synthTNK2; var synthTKN2;
var acc0; var acc1; var acc2; var acc3;


contract('SynthsLiquidate', function (accounts) {
    constructor(accounts)
    wrapBNB()
    createPoolWBNB()
    addLiquidityBNB(acc0,_.BN2Str(20*_.one),  _.BN2Str(10*_.one));
    LpUnits();
    addLiquidityBNB(acc0,_.BN2Str(5*_.one),  _.BN2Str(3*_.one));
    LpUnits();
     
    
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
        curate = await CURATED.new(base.address, wbnb.address);
        token1 = await TOKEN.new()             //deploy token
        token2 = await TOKEN2.new() 
        leverage = await LEVERAGE.new(base.address,wbnb.address );

        await Dao.setGenesisAddresses(router.address, utils.address, synthRouter.address, bond.address, daoVault.address, curate.address);

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
async function createPoolWBNB() {
    it("It should deploy BNB Pool", async () => {
        var _pool = await curate.createPool.call(wbnb.address)
        await curate.createPool(wbnb.address)
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        let supply = await base.totalSupply()
        await base.approve(poolWBNB.address, supply, { from: acc0 })
        await base.approve(poolWBNB.address, supply, { from: acc1 })
        await poolWBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await poolWBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await poolWBNB.approve(synthRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await poolWBNB.approve(leverage.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await poolWBNB.approve(leverage.address, _.BN2Str(500000 * _.one), { from: acc1 });
        await poolWBNB.approve(leverage.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}
async function addLiquidityBNB(acc, b, t) {
    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = wbnb.address
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolWBNB.totalSupply()))
        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        console.log("utils ",units/_.one);
        let slip = math.getSlipAdustment(b, B, t,  T)
        console.log("slip ",slip/_.one);
        await router.addLiquidity(b, t, token, { from: acc})
    })
}


function LpUnits() {
    it("Show Address", async () => {
        let lpunits = _.BN2Str(await poolWBNB.balanceOf(acc0));
        console.log("actual ",lpunits/_.one);
})
}

