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
var TOKEN1 = artifacts.require("./Token1.sol");
var WBNB = artifacts.require("./WBNB");

var base; var token1;  var token2; var wbnb;
var utils; var utils2; var router; var router2; var Dao; var Dao2;
var poolWBNB; var poolTKN1;
var acc0; var acc1; var acc2; var acc3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

contract('DAO', function (accounts) {

    constructor(accounts)
    wrapBNB()
    createPools()
    addLiquidityTKN1(acc1)
    addLiquidityTKN1(acc2)
    addLiquidityTKN1(acc3)

    swapPassR1(acc0, _.BN2Str(_.one * 10))

    lockFail()
    lockWBNB(acc0, _.BN2Str(_.one * 5)) // 13% >16%
    lockTKN(acc1, _.BN2Str(_.one * 10)) // 25% <33%
    lockTKN(acc2, _.BN2Str(_.one * 10)) // 25% +1 >33% <50%
    lockTKN(acc3, _.BN2Str(_.one * 15)) // 37% +1 >50%
    // rate()

    voteParam()
    voteIncentive()
    voteAction()
    voteList()
    voteGrant()

    voteRouter(acc0)
    swapPassR2(acc0, _.BN2Str(_.one * 10))

    voteUtils(acc0)
    swapPassR2(acc0, _.BN2Str(_.one * 10))

    voteDao(acc0)
    swapPassR2(acc0, _.BN2Str(_.one * 10))

    harvest()
    withdrawBNB(acc0)
    withdrawTKN1(acc1)

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
        await base.changeDAO(Dao.address)
        await Dao.setGenesisAddresses(router.address, utils.address)
        // await Dao.purgeDeployer()
        // assert.equal(await Dao.DEPLOYER(), '0x0000000000000000000000000000000000000000', " deployer purged")
        //console.log(await utils.BASE())
        //console.log(await Dao.ROUTER())

        token1 = await TOKEN1.new();
        token2 = await TOKEN1.new();
        //console.log(`Acc0: ${acc0}`)
        //console.log(`base: ${base.address}`)
        //console.log(`dao: ${Dao.address}`)
        //console.log(`utils: ${utils.address}`)
        //console.log(`router: ${router.address}`)
        //console.log(`token1: ${token1.address}`)

        let supply = await token1.totalSupply()
        await base.transfer(acc1, _.getBN(_.BN2Str(10000 * _.one)))
        await base.transfer(acc2, _.getBN(_.BN2Str(10000 * _.one)))
        await base.transfer(acc3, _.getBN(_.BN2Str(10000 * _.one)))

        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc3 })

        await token1.transfer(acc1, _.getBN(_.BN2Int(supply)/4))
        await token1.transfer(acc2, _.getBN(_.BN2Int(supply)/4))
        await token1.transfer(acc3, _.getBN(_.BN2Int(supply)/4))

        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
        await token1.approve(router.address, _.BN2Str(500000 * _.one), { from: acc3 })
    });
}

async function wrapBNB() {
    it("It should wrap", async () => {
        await web3.eth.sendTransaction({to: wbnb.address, value:_.BN2Str(_.one*100), from:acc0});
        await wbnb.transfer(acc1, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.transfer(acc2, _.getBN(_.BN2Int(_.one * 30)))
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
        await wbnb.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })
    })
}

async function createPools() {
    it("It should deploy WBNB Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, wbnb.address)
        await router.createPool(_.BN2Str(_.one * 10), _.dot1BN, wbnb.address)
        poolWBNB = await POOL.at(_pool)
        //console.log(`Pools: ${poolWBNB.address}`)
        const baseAddr = await poolWBNB.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(_.one * 10), 'base balance')
        assert.equal(_.BN2Str(await wbnb.balanceOf(poolWBNB.address)), _.dot1BN, 'wbnb balance')

        let supply = await base.totalSupply()
        await base.approve(poolWBNB.address, supply, { from: acc0 })
        await base.approve(poolWBNB.address, supply, { from: acc1 })
    })

    it("It should deploy TKN1 Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        poolTKN1 = await POOL.at(_pool)
        //console.log(`Pools: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolTKN1.address)), _.BN2Str(_.one * 10), 'base balance')
        assert.equal(_.BN2Str(await token1.balanceOf(poolTKN1.address)), _.BN2Str(_.one * 100), 'token1 balance')

        let supply = await base.totalSupply()
        await base.approve(poolTKN1.address, supply, { from: acc0 })
        await base.approve(poolTKN1.address, supply, { from: acc1 })
    })
}

async function addLiquidityTKN1(acc) {
    it("It should deposit", async () => {
        await router.addLiquidity(_.BN2Str(_.one * 15), _.BN2Str(_.one * 200), token1.address, { from: acc})
    })
}

async function lockFail() {
    it("It should revert for not pool", async () => {
        let balance = await token1.balanceOf(acc0)
        await token1.approve(Dao.address, balance)
        await truffleAssert.reverts(Dao.deposit(token1.address, balance, { from: acc0 }));
    })
    it("It should revert for no balance", async () => {
        let balance = await token1.balanceOf(acc1)
        await token1.approve(Dao.address, balance)
        await truffleAssert.reverts(Dao.deposit(token1.address, balance, { from: acc1 }));
    })
}

async function lockWBNB(acc, amount) {
    it("It should deposit", async () => {
        // let balance = await poolWBNB.balanceOf(acc)
        // await poolWBNB.approve(Dao.address, balance, { from: acc })
        await Dao.deposit(poolWBNB.address, amount, { from: acc })
        //console.log(`isMember: ${await Dao.isMember(acc)}`)
        //console.log(`mapMemberPool_balance: ${await Dao.mapMemberPool_balance(acc, poolWBNB.address)}`)
        //console.log(`totalWeight: ${await Dao.totalWeight()}`)
        //console.log(`mapMember_weight: ${await Dao.mapMember_weight(acc)}`)
    })
}

async function lockTKN(acc, amount) {
    it("It should deposit", async () => {
        // let balance = await poolTKN1.balanceOf(acc)
        // //console.log(`balance: ${balance}`)
        // await poolTKN1.approve(Dao.address, balance, { from: acc })
        await Dao.deposit(poolTKN1.address, amount, { from: acc })
        //console.log(`isMember: ${await Dao.isMember(acc)}`)
        //console.log(`mapMemberPool_balance: ${await Dao.mapMemberPool_balance(acc, poolWBNB.address)}`)
        //console.log(`totalWeight: ${await Dao.totalWeight()}`)
        //console.log(`mapMember_weight: ${await Dao.mapMember_weight(acc)}`)
        //console.log(`rate: ${_.getBN(await Dao.mapMember_weight(acc)).div(_.getBN(await Dao.totalWeight()))}`)
    })
}
async function rate() {
    it("It should check rates", async () => {
        console.log(`acc0 rate: ${await Dao.mapMember_weight(acc0)} ${_.getBN(await Dao.mapMember_weight(acc0)).div(_.getBN(await Dao.totalWeight()))}`)
        console.log(`acc1 rate: ${await Dao.mapMember_weight(acc1)} ${_.getBN(await Dao.mapMember_weight(acc1)).div(_.getBN(await Dao.totalWeight()))}`)
        console.log(`acc2 rate: ${await Dao.mapMember_weight(acc2)} ${_.getBN(await Dao.mapMember_weight(acc2)).div(_.getBN(await Dao.totalWeight()))}`)
        console.log(`acc3 rate: ${await Dao.mapMember_weight(acc3)} ${_.getBN(await Dao.mapMember_weight(acc3)).div(_.getBN(await Dao.totalWeight()))}`)

    })
}

async function voteParam() {
    it("It should vote, finalise curve", async () => {
        await Dao.newParamProposal('1012', 'CURVE', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc0 })
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), _.BN2Str(await Dao.mapPIDMember_votes(proposalCount, acc0)))
        assert.equal(await Dao.mapPID_param(proposalCount), '1012')
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "Must be finalising");
        await Dao.voteProposal(proposalCount, { from: acc1 })
        assert.equal(await Dao.hasQuorum(proposalCount), true)
        assert.equal(await Dao.mapPID_finalising(proposalCount), true)
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "Must be after cool off");
        await sleep(1100)
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
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "Must be finalising");
        await Dao.voteProposal(proposalCount, { from: acc1 })
        assert.equal(await Dao.hasQuorum(proposalCount), true)
        assert.equal(await Dao.mapPID_finalising(proposalCount), true)
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "Must be after cool off");
        await sleep(1100)

        await Dao.newParamProposal('2500', 'DURATION', { from: acc0 })
        let proposalID2 = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalID2, { from: acc0 })
        await truffleAssert.reverts(Dao.cancelProposal(proposalCount, proposalID2, { from: acc0 }), "Must have minority");
        await Dao.voteProposal(proposalID2, { from: acc1 })
        await Dao.cancelProposal(proposalCount, proposalID2, { from: acc1 })
        await sleep(1100)
        await Dao.finaliseProposal(proposalID2)
        assert.equal(await base.secondsPerEra(), '2500')
        assert.equal(await Dao.secondsPerEra(), '2500')
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalID2)), '0')
        assert.equal(await Dao.mapPID_finalising(proposalID2), false)
        assert.equal(await Dao.mapPID_finalised(proposalID2), true)
    })
    it("It should vote, finalise COOL_OFF", async () => {
        await Dao.newParamProposal('1', 'COOL_OFF', { from: acc1 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), _.BN2Str(await Dao.mapPIDMember_votes(proposalCount, acc1)))
        assert.equal(await Dao.mapPID_param(proposalCount), '1')
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "Must be finalising");
        await Dao.voteProposal(proposalCount, { from: acc2 })
        assert.equal(await Dao.hasQuorum(proposalCount), true)
        assert.equal(await Dao.mapPID_finalising(proposalCount), true)
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "Must be after cool off");
        await sleep(1100)
        await Dao.finaliseProposal(proposalCount)
        assert.equal(await Dao.coolOffPeriod(), '1')
        assert.equal(_.BN2Str(await Dao.mapPID_votes(proposalCount)), '0')
        assert.equal(await Dao.mapPID_finalising(proposalCount), false)
        assert.equal(await Dao.mapPID_finalised(proposalCount), true)
    })
    it("It should vote, finalise ERAS_TO_EARN", async () => {
        await Dao.newParamProposal('10', 'ERAS_TO_EARN', { from: acc1 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await sleep(2100)
        await Dao.finaliseProposal(proposalCount)
        assert.equal(_.BN2Str(await Dao.erasToEarn()), '10')
    })
}

async function voteIncentive() {
    it("It should vote, finalise INCENTIVE", async () => {
        await Dao.newAddressProposal(acc3, 'INCENTIVE', { from: acc1 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await sleep(2100)
        await truffleAssert.reverts(Dao.finaliseProposal(proposalCount), "Must be finalising");
        await Dao.voteProposal(proposalCount, { from: acc3 })
        //console.log(_.BN2Str(await Dao.mapPID_votes(proposalCount)), _.BN2Str(await Dao.totalWeight()))
        await sleep(2100)
        await Dao.finaliseProposal(proposalCount)
        assert.equal(await base.incentiveAddress(), acc3)
    })
}

async function voteAction() {
    it("It should vote, finalise START_EMISSIONS", async () => {
        await Dao.newActionProposal('START_EMISSIONS', { from: acc1 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await sleep(2100)
        await Dao.finaliseProposal(proposalCount)
        assert.equal(await base.emitting(), true)
        await base.transfer(acc1, _.getBN(_.BN2Str(1 * _.one)))
        let balance = await base.balanceOf(acc3)
        //console.log(_.BN2Str(balance))
    })
    it("It should vote, finalise STOP_EMISSIONS", async () => {
        await Dao.newActionProposal('STOP_EMISSIONS', { from: acc1 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await sleep(2100)
        await Dao.finaliseProposal(proposalCount)
        assert.equal(await base.emitting(), false)
    })
}

async function voteList() {
    it("It should LIST", async () => {
        await Dao.newListProposal(token2.address, '1000', '1000000', { from: acc1 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await sleep(2100)
        await Dao.finaliseProposal(proposalCount)
        assert.equal(await base.isListed(token2.address), true)
    })
    it("It should DELIST", async () => {
        await Dao.newAddressProposal(token2.address, 'DELIST', { from: acc1 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await sleep(2100)
        await Dao.finaliseProposal(proposalCount)
        assert.equal(await base.isListed(token2.address), false)
    })
}

async function voteGrant() {
    it("It should GRANT", async () => {
        await base.transfer(Dao.address, '1100');
        await Dao.newGrantProposal(acc3, '1000', { from: acc1 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc1 })
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await sleep(2100)
        let balanceBefore = _.getBN(await base.balanceOf(acc3))
        await Dao.finaliseProposal(proposalCount)
        let balanceAfter = _.getBN(await base.balanceOf(acc3))
        assert.equal(_.BN2Str(balanceAfter.minus(balanceBefore)), '1000')
    })
}

async function voteRouter() {
    it("It should vote Router", async () => {
        router2 = await ROUTER.new(base.address, wbnb.address)
        await router2.migrateRouterData(router.address);
        await router2.migrateTokenData(router.address);
        await Dao.newAddressProposal(router2.address, 'ROUTER', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await Dao.voteProposal(proposalCount, { from: acc3 })
        await sleep(2100)
        await Dao.finaliseProposal(proposalCount);
        assert.equal(await Dao.ROUTER(), router2.address)
    })
}

async function voteUtils() {
    it("It should vote", async () => {
        utils2 = await UTILS.new(base.address)
        await Dao.newAddressProposal(utils2.address, 'UTILS', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc3 })
        await sleep(2100)
        await Dao.finaliseProposal(proposalCount);
        assert.equal(await Dao.UTILS(), utils2.address)
    })
}

async function voteDao() {
    it("It should vote", async () => {
        Dao2 = await DAO.new(base.address)
        await Dao2.setGenesisAddresses(router2.address, utils.address)
        await Dao.newAddressProposal(Dao2.address, 'DAO', { from: acc0 })
        let proposalCount = _.BN2Str(await Dao.proposalCount())
        await Dao.voteProposal(proposalCount, { from: acc2 })
        await Dao.voteProposal(proposalCount, { from: acc3 })
        await sleep(2100)
        await Dao.finaliseProposal(proposalCount);
        assert.equal(await Dao.DAO(), Dao2.address)
        assert.equal(await Dao.daoHasMoved(), true)
    })
}

async function swapPassR1(acc, b) {

    it(`It should buy BNB with BASE from ${acc}`, async () => {
        //console.log(`base: ${await utils.BASE()}`)
        //console.log(`DAO: ${await base.DAO()}`)
        //console.log(`ROUTER: ${await Dao.ROUTER()}`)
        await _passSwap(acc, b, router)
        //await help.logPool(utils, _.BNB, 'BNB')
        
    })
}

async function swapPassR2(acc, b) {

    it(`It should buy BNB with BASE from ${acc}`, async () => {
        //console.log(`base: ${await utils.BASE()}`)
        //console.log(`DAO: ${await base.DAO()}`)
        //console.log(`ROUTER: ${await Dao.ROUTER()}`)
        await _passSwap(acc, b, router2)
        //await help.logPool(utils, _.BNB, 'BNB')

    })
}

async function _passSwap(acc, b, router) {

    it(`It should buy BNB with BASE from ${acc}`, async () => {
        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        const B = _.getBN(poolData.baseAmount)
        const T = _.getBN(poolData.tokenAmount)
        //console.log('start data', _.BN2Str(B), _.BN2Str(T))

        let t = math.calcSwapOutput(b, B, T)
        let fee = math.calcSwapFee(b, B, T)
        //console.log(_.BN2Str(t), _.BN2Str(T), _.BN2Str(B), _.BN2Str(b), _.BN2Str(fee))
        
        let tx = await router.buy(b, _.BNB)
        poolData = await utils.getPoolData(token);

        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(b))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(t))
        // assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.tokenAmount), _.BN2Str(T.minus(t)))
        assert.equal(_.BN2Str(poolData.baseAmount), _.BN2Str(B.plus(b)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(poolWBNB.address)), _.BN2Str(T.minus(t)), 'ether balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolWBNB.address)), _.BN2Str(B.plus(b)), 'base balance')
        
    })
}

async function harvest() {
    it("It should send rewards and check", async () => {
        await base.transfer(Dao.address, "10000000000000000000")
        let now = _.getBN((new Date())/1000)

        let lastTime = _.getBN(await Dao.mapMember_lastTime(acc0))
        let calcCurrentReward = _.getBN(await Dao.calcCurrentReward(acc0))
        let calcReward = _.getBN(await Dao.calcReward(acc0))
        assert.exists(_.BN2Str(lastTime.minus(now)))
        assert.exists(_.BN2Str(calcCurrentReward))
        assert.exists(_.BN2Str(calcReward))

        let lastTime2 = _.getBN(await Dao.mapMember_lastTime(acc0))
        let calcCurrentReward2 = _.getBN(await Dao.calcCurrentReward(acc1))
        let calcReward2 = _.getBN(await Dao.calcReward(acc1))
        assert.exists(_.BN2Str(lastTime2.minus(now)))
        assert.exists(_.BN2Str(calcCurrentReward2))
        assert.exists(_.BN2Str(calcReward2))

        let lastTime3 = _.getBN(await Dao.mapMember_lastTime(acc2))
        let calcCurrentReward3 = _.getBN(await Dao.calcCurrentReward(acc2))
        let calcReward3 = _.getBN(await Dao.calcReward(acc2))
        assert.exists(_.BN2Str(lastTime3.minus(now)))
        assert.exists(_.BN2Str(calcCurrentReward3))
        assert.exists(_.BN2Str(calcReward3))

        let lastTime4= _.getBN(await Dao.mapMember_lastTime(acc3))
        let calcCurrentReward4 = _.getBN(await Dao.calcCurrentReward(acc3))
        let calcReward4 = _.getBN(await Dao.calcReward(acc3))
        assert.exists(_.BN2Str(lastTime4.minus(now)))
        assert.exists(_.BN2Str(calcCurrentReward4))
        assert.exists(_.BN2Str(calcReward4))
    })
    it("It should harvest acc0", async () => {
        let balBefore = _.getBN(await base.balanceOf(acc0))
        await Dao.harvest({from:acc0});
        let balAfter = _.getBN(await base.balanceOf(acc0))
        assert.isAtLeast(_.BN2Int(balAfter.minus(balBefore)), 1081571440679798)
    })
    it("It should harvest acc1", async () => {
        let balBefore = _.getBN(await base.balanceOf(acc1))
        await Dao.harvest({from:acc1});
        let balAfter = _.getBN(await base.balanceOf(acc1))
        assert.isAtLeast(_.BN2Int(balAfter.minus(balBefore)), 2963547306478324)
    })
    it("It should harvest acc2", async () => {
        let balBefore = _.getBN(await base.balanceOf(acc2))
        await Dao.harvest({from:acc2});
        let balAfter = _.getBN(await base.balanceOf(acc2))
        assert.isAtLeast(_.BN2Int(balAfter.minus(balBefore)), 2964686453150876)
    })
    it("It should harvest acc3", async () => {
        let balBefore = _.getBN(await base.balanceOf(acc3))
        await Dao.harvest({from:acc3});
        let balAfter = _.getBN(await base.balanceOf(acc3))
        assert.isAtLeast(_.BN2Int(balAfter.minus(balBefore)), 4248738399735143)
    })
}
async function withdrawBNB(acc) {
    it("It should unlock", async () => {
        let balBefore = _.getBN(await poolWBNB.balanceOf(acc))
        await Dao.withdraw(poolWBNB.address, {from:acc});
        let balAfter = _.getBN(await poolWBNB.balanceOf(acc))
        assert.equal(_.BN2Str(balAfter.minus(balBefore)), "5000000000000000000")
    })
}
async function withdrawTKN1(acc) {
    it("It should unlock", async () => {
        let balBefore = _.getBN(await poolTKN1.balanceOf(acc))
        await Dao.withdraw(poolTKN1.address, {from:acc});
        let balAfter = _.getBN(await poolTKN1.balanceOf(acc))
        assert.equal(_.BN2Str(balAfter.minus(balBefore)), "10000000000000000000")
    })
}

