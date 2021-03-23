const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var BASE = artifacts.require("./BaseMinted.sol");
var BOND = artifacts.require("./Bond.sol");
var DAO = artifacts.require("./Dao.sol");
var ROUTER = artifacts.require("./Router.sol");
var POOL = artifacts.require("./Pool.sol");
var UTILS = artifacts.require("./Utils.sol");
var POOLFACTORY = artifacts.require("./poolFactory.sol");
var WBNB = artifacts.require("./WBNB");
var TOKEN = artifacts.require("./Token1.sol");
var DAOVAULT = artifacts.require("./DaoVault.sol");
var base; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1; var synthTNK2; var synthBNB;
var acc0; var acc1; var acc2; var acc3;
var allocation = 2500000;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
contract('DAO', function (accounts) {

    constructor(accounts)
    wrapBNB()
    createPoolWBNB()
    createPoolTKN1()
    addLiquidityTKN1(acc1,  _.BN2Str(40*_.one),  _.BN2Str(20*_.one))
    addLiquidityTKN1(acc0,  _.BN2Str(40*_.one),  _.BN2Str(20*_.one))
    addLiquidityBNB(acc1,  _.BN2Str(40*_.one),  _.BN2Str(20*_.one))
    addLiquidityBNB(acc0,  _.BN2Str(40*_.one),  _.BN2Str(20*_.one))
    addLiquidityBNB(acc2,  _.BN2Str(40*_.one),  _.BN2Str(20*_.one))
    addLiquidityTKN1(acc2,  _.BN2Str(20*_.one),  _.BN2Str(10*_.one))
    curatePools()
    burnBOND()
    lockWBNB(acc0, _.BN2Str(_.one * 1)) // 16% 
    lockTKN(acc0, _.BN2Str(_.one * 0.5)) // 16% 
    lockTKN(acc1, _.BN2Str(_.one * 3)) // 50% 
    lockTKN(acc2, _.BN2Str(_.one * 2)) // 33% 
    rate()
    // voteParam()
    // voteIncentive()
    // voteAction()
    // voteGrant()
    // voteUtils()
    // voteRouter()
    //voteDao()
    //  withdrawBNB(acc0)
    //  withdrawTKN1(acc1)
    harvest()

})


function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    it("constructor events", async () => {
        //SPARTANPROTOCOLv2
        base = await BASE.new() // deploy base
        wbnb = await WBNB.new() // deploy wBNB
        Dao = await DAO.new(base.address)     // deploy daoV2
        router = await ROUTER.new(base.address, wbnb.address, Dao.address) //deploy router
        utils = await UTILS.new(base.address, router.address, Dao.address) // deploy utilsV2
        poolFactory = await POOLFACTORY.new(base.address,  wbnb.address, Dao.address) 
        token1 = await TOKEN.new()    
        bond = await BOND.new(base.address, wbnb.address, Dao.address);     //deploy new bond 
        daoVault = await DAOVAULT.new(base.address, Dao.address);
        await base.listAsset(bond.address, _.BN2Str(allocation* _.one),_.BN2Str(18*_.one) ) // list bond
        await Dao.setGenesisAddresses(router.address, utils.address, utils.address, bond.address, daoVault.address,poolFactory.address, utils.address);
        let migration = true;
        await base.changeDAO(Dao.address)
        await Dao._MSTATUS(migration);
    
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
async function burnBOND(){
    it("Burn bond for Allocation", async () => {
        let lockBalBefore = await bond.balanceOf(bond.address)
        assert.equal(_.BN2Str(lockBalBefore), _.BN2Str(_.one), '1 bond exist')
        let spartaBalBefore = await base.balanceOf(bond.address)
        assert.equal(spartaBalBefore,'0', 'Sparta balance zero')
        await bond.approve(base.address, lockBalBefore, {from:acc0})
        expect(_.BN2Str(await bond.allowance(acc0, base.address))).to.equal(_.BN2Str(lockBalBefore));
        let tx = await bond.burnBond()
        let lockBalAfter = await bond.balanceOf(bond.address)
        assert.equal(lockBalAfter,'0',  'bond was burnt')
        let spartaBalAfter = await base.balanceOf(bond.address)
        assert.equal(_.BN2Str(spartaBalAfter/_.one),"2500000", 'did it get 2.5m sparta')
    })
}
async function createPoolWBNB(SPT, token) {
    it("It should deploy BNB Pool", async () => {
        var _pool = await poolFactory.createPool.call( wbnb.address)
        await poolFactory.createPool(wbnb.address)
        poolWBNB = await POOL.at(_pool)

    })
}
async function createPoolTKN1(SPT, token) {
    it("It should deploy TKN1 Pool", async () => {
        var _pool = await poolFactory.createPool.call(token1.address)
        await poolFactory.createPool(token1.address)
        poolTKN1 = await POOL.at(_pool)


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
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function addLiquidityTKN1(acc, b, t) {
    it(`It should addLiquidity TKN from ${acc}`, async () => {
        let token = token1.address
        let poolData = await utils.getPoolData(token);
        var B = _.getBN(poolData.baseAmount)
        var T = _.getBN(poolData.tokenAmount)
        poolUnits = _.getBN((await poolTKN1.totalSupply()))
        let units = math.calcLiquidityUnits(b, B, t, T, poolUnits)
        let tx = await router.addLiquidity(b, t, token, { from: acc})
    })
}
async function curatePools() {
    it("Curate POOls", async () => {
        await poolFactory.addCuratedPool(wbnb.address);
        await poolFactory.addCuratedPool(token1.address);
       
    })
}
async function lockTKN(acc, amount) {
    it("It should deposit", async () => {
        await Dao.deposit(poolTKN1.address, amount, { from: acc })
        let balancee = await poolWBNB.balanceOf(acc)
        // console.log(`balanceA: ${balancee}`)
        // console.log(`isMember: ${await Dao.isMember(acc)}`)
        // console.log(`mapMemberPool_balance: ${await daoVault.mapMemberPool_balance(acc, poolTKN1.address)}`)
        // console.log(`totalWeight: ${await daoVault.totalWeight()}`)
        // console.log(`mapMember_weight: ${await daoVault.mapMember_weight(acc)}`)
        // console.log(`rate: ${_.getBN(await daoVault.mapMember_weight(acc)).div(_.getBN(await daoVault.totalWeight()))}`)
    })
}
async function lockWBNB(acc, amount) {
    it("It should deposit", async () => {
         let balance = await poolWBNB.balanceOf(acc)
        // await poolWBNB.approve(Dao.address, balance, { from: acc })
        await Dao.deposit(poolWBNB.address, amount, { from: acc })
        // console.log(`balanceA: ${balance}`)
        // console.log(`isMember: ${await Dao.isMember(acc)}`)
        // console.log(`mapMemberPool_balance: ${await daoVault.mapMemberPool_balance(acc, poolWBNB.address)}`)
        // console.log(`totalWeight: ${await daoVault.totalWeight()}`)
        // console.log(`mapMember_weight: ${await daoVault.mapMember_weight(acc)}`)
        // console.log(`rate: ${_.getBN(await daoVault.mapMember_weight(acc)).div(_.getBN(await daoVault.totalWeight()))}`)
       
    })
}
async function withdrawBNB(acc) {
    it("It should unlock", async () => {
        let balBefore = _.getBN(await poolWBNB.balanceOf(acc))
         let balBeforeD = _.getBN(await poolWBNB.balanceOf(daoVault.address))
        console.log(_.BN2Str(balBeforeD));
        await Dao.withdraw(poolWBNB.address,_.BN2Str(1 * _.one), {from:acc});
        let balAfter = _.getBN(await poolWBNB.balanceOf(acc))
        assert.isAbove(_.BN2Int(balAfter), _.BN2Int(balBefore))
        console.log(_.BN2Str(balAfter));
    })
}
async function withdrawTKN1(acc) {
    it("It should unlock", async () => {
        let balBefore = _.getBN(await poolTKN1.balanceOf(acc))
         let balBeforeD = _.getBN(await poolTKN1.balanceOf(daoVault.address))
        console.log(_.BN2Str(balBeforeD));
        await Dao.withdraw(poolTKN1.address,_.BN2Str(1 * _.one), {from:acc});
        let balAfter = _.getBN(await poolTKN1.balanceOf(acc))
        assert.isAbove(_.BN2Int(balAfter), _.BN2Int(balBefore))
        console.log(_.BN2Str(balAfter));
    })
}


async function rate() {
    it("It should check rates", async () => {
        console.log(`acc0 rate: ${await daoVault.mapMember_weight(acc0)} ${_.getBN(await daoVault.mapMember_weight(acc0)).div(_.getBN(await daoVault.totalWeight()))}`)
        console.log(`acc1 rate: ${await daoVault.mapMember_weight(acc1)} ${_.getBN(await daoVault.mapMember_weight(acc1)).div(_.getBN(await daoVault.totalWeight()))}`)
        console.log(`acc2 rate: ${await daoVault.mapMember_weight(acc2)} ${_.getBN(await daoVault.mapMember_weight(acc2)).div(_.getBN(await daoVault.totalWeight()))}`)
        //console.log(`acc3 rate: ${await Dao.mapMember_weight(acc3)} ${_.getBN(await Dao.mapMember_weight(acc3)).div(_.getBN(await Dao.totalWeight()))}`)

    })
}

async function voteParam() {
    it("It should vote, finalise curve", async () => {
        await Dao.newParamProposal('1012', 'CURVE', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc0 })
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), _.BN2Str(await Dao.mapPIDMember_votes(proposalCount, acc0)))
        assert.equal(await Dao.mapPID_param(proposalCount), '1012')
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "!finalising");
        await Dao.voteProposal(proposalCount, { from: acc1 })
        assert.equal(await Dao.hasQuorum(proposalCount), true)
        assert.equal(await Dao.mapPID_finalising(proposalCount), true)
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "!cool off");
        await sleep(3100)
        await Dao.finaliseProposal(proposalCount)
        assert.equal(await base.emissionCurve(), '1012')
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), '0')
        assert.equal(await Dao.mapPID_finalising(proposalCount), false)
        assert.equal(await Dao.mapPID_finalised(proposalCount), true)
    })
    it("It should vote, cancel, then revote DURATION", async () => {
        await Dao.newParamProposal('86000', 'DURATION', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc0 })
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), _.BN2Str(await Dao.mapPIDMember_votes(proposalCount, acc0)))
        assert.equal(await Dao.mapPID_param(proposalCount), '86000')
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "!finalising");
        await Dao.voteProposal(proposalCount, { from: acc1 })
        assert.equal(await Dao.hasQuorum(proposalCount), true)
        assert.equal(await Dao.mapPID_finalising(proposalCount), true)
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "!cool off");
        await sleep(3100)
        await Dao.newParamProposal('2500', 'DURATION', { from: acc0 })
        let proposalID2 = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalID2, { from: acc0 })
        await truffleAssert.reverts(Dao.cancelProposal(proposalCount, proposalID2, { from: acc0 }), "!minority");
        await Dao.voteProposal(proposalID2, { from: acc1 })
        await Dao.cancelProposal(proposalCount, proposalID2, { from: acc1 })
        await sleep(3100)
        await Dao.finaliseProposal(proposalID2)
        assert.equal(await base.secondsPerEra(), '2500')
        assert.equal(await Dao.secondsPerEra(), '2500')
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalID2)), '0')
        assert.equal(await Dao.mapPID_finalising(proposalID2), false)
        assert.equal(await Dao.mapPID_finalised(proposalID2), true)
    })
    it("It should vote, finalise COOL_OFF", async () => {
        await Dao.newParamProposal('2', 'COOL_OFF', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc0 })
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), _.BN2Str(await Dao.mapPIDMember_votes(proposalCount, acc0)))
        assert.equal(await Dao.mapPID_param(proposalCount), '2')
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "!finalising");
        await Dao.voteProposal(proposalCount, { from: acc1 })
        assert.equal(await Dao.hasQuorum(proposalCount), true)
        assert.equal(await Dao.mapPID_finalising(proposalCount), true)
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "!cool off");
        await sleep(3100)
        await Dao.finaliseProposal(proposalCount)
        assert.equal(await Dao.coolOffPeriod(), '2')
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), '0')
        assert.equal(await Dao.mapPID_finalising(proposalCount), false)
        assert.equal(await Dao.mapPID_finalised(proposalCount), true)
    })
    it("It should vote, finalise ERAS_TO_EARN", async () => {
        let bal = _.getBN(await base.balanceOf(router.address));
        console.log(_.BN2Str(bal)/_.one);
        await Dao.newParamProposal('10', 'ERAS_TO_EARN', { from: acc0 })
        let balA = _.getBN(await base.balanceOf(router.address));
        console.log(_.BN2Str(balA)/_.one);
        //assert.equal(_.BN2Str(balA), _.BN2Str(bal.plus(100*_.one)))
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await sleep(3100)
        await Dao.finaliseProposal(proposalCount)
        assert.equal(_.BN2Str(await Dao.erasToEarn()), '10')
    })
}

async function voteIncentive() {
    it("It should vote, finalise INCENTIVE", async () => {
        await Dao.newAddressProposal(acc3, 'INCENTIVE', { from: acc1 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc0 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await sleep(3100)
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "!finalising");
        await Dao.voteProposal(proposalCount, { from: acc1 })
        //console.log(_.BN2Str(await Dao.mapPID_votes(proposalCount)), _.BN2Str(await Dao.totalWeight()))
        await sleep(3100)
        await Dao.finaliseProposal(proposalCount)
        assert.equal(await base.incentiveAddress(), acc3)
    })
}

async function voteAction() {
    // it("It should vote, finalise START_EMISSIONS", async () => {
    //     await Dao.newActionProposal('START_EMISSIONS', { from: acc1 })
    //     let proposalCount = _.BN2Str(await Dao.proposalCount())
    //     await Dao.voteProposal(proposalCount, { from: acc1 })
    //     await Dao.voteProposal(proposalCount, { from: acc2 })
    //     await sleep(3100)
    //     await Dao.finaliseProposal(proposalCount)
    //     assert.equal(await base.emitting(), true)
    //     await base.transfer(acc1, _.getBN(_.BN2Str(1 * _.one)))
    //     let balance = await base.balanceOf(acc3)
    //     //console.log(_.BN2Str(balance))
    // })
    // it("It should vote, finalise STOP_EMISSIONS", async () => {
    //     await Dao.newActionProposal('STOP_EMISSIONS', { from: acc1 })
    //     let proposalCount = _.BN2Str(await Dao.proposalCount())
    //     await Dao.voteProposal(proposalCount, { from: acc1 })
    //     await Dao.voteProposal(proposalCount, { from: acc2 })
    //     await sleep(3100)
    //     await Dao.finaliseProposal(proposalCount)
    //     assert.equal(await base.emitting(), false)
    // })
    it("It should vote, mint BOND", async () => {
        let bondSpartaBaLb = _.BN2Str(await base.balanceOf(bond.address));
        console.log(bondSpartaBaLb/_.one);
        await Dao.newActionProposal('GET_SPARTA', { from: acc1 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.removeVote(proposalCount, { from: acc1 })
        await sleep(3100)
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "!finalising");
        //await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await sleep(3100)
        await Dao.finaliseProposal(proposalCount)
        let bondSpartaBaL = _.BN2Str(await base.balanceOf(bond.address));
        console.log(bondSpartaBaL/_.one);

    })
    // it("It should vote, finalise STOP_EMISSIONS", async () => {
        
    //     await Dao.newActionProposal('STOP_EMISSIONS', { from: acc1 })
    //     let proposalCount = _.BN2Str(await Dao.proposalCount())
    //     await Dao.voteProposal(proposalCount, { from: acc1 })
    //     await Dao.voteProposal(proposalCount, { from: acc2 })
    //     await sleep(3100)
    //     await Dao.finaliseProposal(proposalCount)
       
    // })
}

async function voteGrant() {
    it("It should GRANT", async () => {
        await Dao.newGrantProposal(acc0, '1000', { from: acc1 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await Dao.getGrantDetails(proposalCount)
        await sleep(3100)
        let balanceBefore = _.getBN(await base.balanceOf(acc0))
        await Dao.finaliseProposal(proposalCount)
        let balanceAfter = _.getBN(await base.balanceOf(acc0))
        assert.equal(_.BN2Str(balanceAfter.minus(balanceBefore)), '1000')
    })
}

async function voteUtils() {
    it("It should vote UTILS", async () => {
        utils2 = await UTILS.new(base.address, router.address, Dao.address)
        await Dao.newAddressProposal(utils2.address, 'UTILS', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await sleep(4100)
        await Dao.finaliseProposal(proposalCount);
        assert.equal(await Dao.UTILS(), utils2.address)
    })
}

async function voteRouter() {
    it("It should vote ROUTER", async () => {
        router2 = await ROUTER.new(base.address, wbnb.address, Dao.address)
        await Dao.newAddressProposal(router2.address, 'ROUTER', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await sleep(3100)
        await Dao.finaliseProposal(proposalCount);
        assert.equal(await Dao.ROUTER(), router2.address)
    })
}

async function voteDao() {
    it("It should vote", async () => {
        Dao2 = await DAO.new(base.address)
        await Dao.setGenesisAddresses(router.address, utils.address, utils.address, utils.address, daoVault.address,poolFactory.address, utils.address);
        await Dao.newAddressProposal(Dao2.address, 'DAO', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await sleep(4100)
        await Dao.finaliseProposal(proposalCount);
        assert.equal(await Dao.DAO(), Dao2.address)
        assert.equal(await Dao.daoHasMoved(), true)
    })
}


async function harvest() {
    it("It should send rewards and check", async () => {
        // await base.transfer(router.address, "10000000000000000000")
        let now = _.getBN((new Date())/1000)
        let lastTime = _.getBN(await Dao.mapMember_lastTime(acc1))
       // console.log(`acc1 rate: ${await daoVault.mapMember_weight(acc1)} ${_.getBN(await daoVault.mapMember_weight(acc1)).div(_.getBN(await daoVault.totalWeight()))}`)
        let calcCurrentReward = _.getBN(await Dao.calcCurrentReward(acc1))
        let calcReward = _.getBN(await Dao.calcReward(acc1))
     
        assert.exists(_.BN2Str(lastTime.minus(now)))
        assert.exists(_.BN2Str(calcCurrentReward))
        assert.exists(_.BN2Str(calcReward))
        

        let lastTime2 = _.getBN(await Dao.mapMember_lastTime(acc0))
        let calcCurrentReward2 = _.getBN(await Dao.calcCurrentReward(acc0))
        let calcReward2 = _.getBN(await Dao.calcReward(acc0))
        assert.exists(_.BN2Str(lastTime2.minus(now)))
        assert.exists(_.BN2Str(calcCurrentReward2))
        assert.exists(_.BN2Str(calcReward2))

        let lastTime3 = _.getBN(await Dao.mapMember_lastTime(acc2))
        let calcCurrentReward3 = _.getBN(await Dao.calcCurrentReward(acc2))
        let calcReward3 = _.getBN(await Dao.calcReward(acc2))
        assert.exists(_.BN2Str(lastTime3.minus(now)))
        assert.exists(_.BN2Str(calcCurrentReward3))
        assert.exists(_.BN2Str(calcReward3))

    })
    it("It should harvest acc0", async () => {
        let balBefore = _.getBN(await base.balanceOf(acc0))
       //console.log(_.BN2Str(balBefore)/_.one);
        await sleep(6300)
        await Dao.harvest({from:acc0});
        let balAfter = _.getBN(await base.balanceOf(acc0))
       // console.log(_.BN2Str(balAfter)/_.one);
    })
    it("It should harvest acc1", async () => {
        let balBefore = _.getBN(await base.balanceOf(acc1))
        await sleep(6300)
        await Dao.harvest({from:acc1});
        let balAfter = _.getBN(await base.balanceOf(acc1))
        
    })
    it("It should harvest acc2", async () => {
        let balBefore = _.getBN(await base.balanceOf(acc2))
        await sleep(6300)
        await Dao.harvest({from:acc2});
        let balAfter = _.getBN(await base.balanceOf(acc2))
        
    })

}


