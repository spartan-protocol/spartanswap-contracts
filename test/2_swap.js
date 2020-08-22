/*
################################################
Creates 3 tokens and stakes them
################################################
*/

const assert = require("chai").assert;
const truffleAssert = require('truffle-assertions');
var BigNumber = require('bignumber.js');

const _ = require('./utils.js');
const math = require('./math.js');
const help = require('./helper.js');

var SPARTA = artifacts.require("./SpartaMinted.sol");
var SDAO = artifacts.require("./SDao.sol");
var SROUTER = artifacts.require("./SRouter.sol");
var SPOOL = artifacts.require("./SPool.sol");
var UTILS = artifacts.require("./Utils.sol");
var TOKEN1 = artifacts.require("./Token1.sol");

var sparta; var token1;  var token2; var addr1; var addr2;
var utils; var sRouter; var sDao;
var sPoolETH; var sPoolTKN1; var sPoolTKN2;
var acc0; var acc1; var acc2; var acc3;

contract('SPARTA', function (accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    createPool()
    // checkDetails()
    stake(acc1, _.BN2Str(_.one * 10), _.dot1BN)
    // checkDetails()

    // Single swap
    swapSPARTAToETH(acc0, _.BN2Str(_.one * 10))
    // checkDetails()
    swapETHToSPARTA(acc0, _.BN2Str(_.one * 1))
    // checkDetails()

    stakeTKN1(acc1, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100))
    // checkDetails()

    // // Double swap
    swapTKN1ToETH(acc0, _.BN2Str(_.one * 10))
    // checkDetails()
    swapETHToTKN1(acc0, _.BN2Str(_.one * 1))
    // checkDetails()

    stakeTKN2(acc1, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100))
    checkDetails()

    // // // // // Double swap back
    swapTKN2ToETH(acc0, _.BN2Str(_.one * 10))
    // checkDetails()
    swapETHToTKN2(acc0, _.BN2Str(_.one * 1))
    // checkDetails()

    unstakeETH(10000, acc1)
    // checkDetails()
    unstakeTKN1(10000, acc1)
    // checkDetails()
    unstakeTKN2(10000, acc1)
    // checkDetails()
    unstakeETH(10000, acc0)
    // checkDetails()
    unstakeTKN1(10000, acc0)
    // checkDetails()
    unstakeTKN2(10000, acc0)
    checkDetails()

})

before(async function() {
    accounts = await ethers.getSigners();
    acc0 = await accounts[0].getAddress(); 
    acc1 = await accounts[1].getAddress(); 
    acc2 = await accounts[2].getAddress(); 
    acc3 = await accounts[3].getAddress()

    sparta = await SPARTA.new()
    utils = await UTILS.new()
    sDao = await SDAO.new(utils.address)
    sRouter = await SROUTER.new(sparta.address, sDao.address, utils.address)
    await utils.setGenesisDao(sDao.address)
    await sDao.setGenesisRouter(sRouter.address)
    assert.equal(await utils.DEPLOYER(), '0x0000000000000000000000000000000000000000', " deployer purged")
    assert.equal(await sDao.DEPLOYER(), '0x0000000000000000000000000000000000000000', " deployer purged")
    console.log(await utils.SDAO())
    console.log(await sDao.ROUTER())

    token1 = await TOKEN1.new();
    token2 = await TOKEN1.new();

    console.log(`Acc0: ${acc0}`)
    console.log(`sparta: ${sparta.address}`)
    console.log(`dao: ${sDao.address}`)
    console.log(`utils: ${utils.address}`)
    console.log(`sRouter: ${sRouter.address}`)
    console.log(`token1: ${token1.address}`)

    await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
    await sparta.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
    await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc0 })
    await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc1 })
    await sparta.approve(sRouter.address, _.BN2Str(500000 * _.one), { from: acc2 })

    let supplyT1 = await token1.totalSupply()
    await token1.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
    await token2.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
    await token1.approve(sRouter.address, supplyT1, { from: acc0 })
    await token1.approve(sRouter.address, supplyT1, { from: acc1 })
    await token2.approve(sRouter.address, supplyT1, { from: acc0 })
    await token2.approve(sRouter.address, supplyT1, { from: acc1 })
})

async function createPool() {
    it("It should deploy Eth Pool", async () => {
        var POOL = await sRouter.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        await sRouter.createPool(_.BN2Str(_.one * 10), _.dot1BN, _.ETH, { value: _.dot1BN })
        sPoolETH = await SPOOL.at(POOL)
        console.log(`Pools: ${sPoolETH.address}`)
        const spartanAddr = await sPoolETH.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")
        assert.equal(_.BN2Str(await sparta.balanceOf(sPoolETH.address)), _.BN2Str(_.one * 10), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(sPoolETH.address)), _.BN2Str(_.dot1BN), 'ether balance')

        let supply = await sparta.totalSupply()
        await sparta.approve(sPoolETH.address, supply, { from: acc0 })
        await sparta.approve(sPoolETH.address, supply, { from: acc1 })
    })

    it("It should deploy TKN1 Pools", async () => {

        await token1.approve(sRouter.address, '-1', { from: acc0 })
        var POOL = await sRouter.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await sRouter.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        sPoolTKN1 = await SPOOL.at(POOL)
        console.log(`Pools1: ${sPoolTKN1.address}`)
        const spartanAddr = await sPoolTKN1.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")

        await sparta.approve(sPoolTKN1.address, '-1', { from: acc0 })
        await sparta.approve(sPoolTKN1.address, '-1', { from: acc1 })
        await token1.approve(sPoolTKN1.address, '-1', { from: acc0 })
        await token1.approve(sPoolTKN1.address, '-1', { from: acc1 })
    })
    it("It should deploy TKN2 Pools", async () => {

        await token2.approve(sRouter.address, '-1', { from: acc0 })
        var POOL = await sRouter.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        await sRouter.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        sPoolTKN2 = await SPOOL.at(POOL)
        console.log(`Pools2: ${sPoolTKN2.address}`)
        const spartanAddr = await sPoolTKN2.SPARTA()
        assert.equal(spartanAddr, sparta.address, "address is correct")

        await sparta.approve(sPoolTKN2.address, '-1', { from: acc0 })
        await sparta.approve(sPoolTKN2.address, '-1', { from: acc1 })
        await token2.approve(sPoolTKN2.address, '-1', { from: acc0 })
        await token2.approve(sPoolTKN2.address, '-1', { from: acc1 })
    })
}

async function stake(acc, v, a) {

    it(`It should stake ETH from ${acc}`, async () => {
        let token = _.ETH
        let sPool = sPoolETH
        let poolData = await utils.getPoolData(token);
        var S = _.getBN(poolData.baseAmt)
        var A = _.getBN(poolData.tokenAmt)
        poolUnits = _.getBN((await sPool.totalSupply()))
        console.log('start data', _.BN2Str(S), _.BN2Str(A), _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(a, A.plus(a), v, S.plus(v))
        console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(S.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
        
        let tx = await sRouter.stake(v, a, token, { from: acc, value: a })
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(S.plus(v)))
        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str(poolData.baseAmtStaked), _.BN2Str(S.plus(v)))
        assert.equal(_.BN2Str(poolData.tokenAmtStaked), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str((await sPool.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
        assert.equal(_.BN2Str(await sPool.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await sparta.balanceOf(sPool.address)), _.BN2Str(S.plus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(sPool.address)), _.BN2Str(A.plus(a)), 'ether balance')

        let memberData = (await utils.getMemberData(token, acc))
        assert.equal(memberData.baseAmtStaked, v, 'baseAmt')
        assert.equal(memberData.tokenAmtStaked, a, 'tokenAmt')

        const tokenBal = _.BN2Token(await web3.eth.getBalance(sPool.address));
        const spartanBal = _.BN2Token(await sparta.balanceOf(sPool.address));
        console.log(`BALANCES: [ ${tokenBal} ETH | ${spartanBal} SPT ]`)
    })
}

async function stakeTKN1(acc, a, v) {
    it(`It should stake TKN1 from ${acc}`, async () => {
        await _stakeTKN(acc, a, v, token1, sPoolTKN1)
        await help.logPool(utils, token1.address, 'TKN1')
    })
}
async function stakeTKN2(acc, a, v) {
    it(`It should stake TKN2 from ${acc}`, async () => {
        await _stakeTKN(acc, a, v, token2, sPoolTKN2)
        await help.logPool(utils, token2.address, 'TKN2')
    })
}

async function _stakeTKN(acc, a, v, token, sPool) {
    let poolData = await utils.getPoolData(token.address);
    var S = _.getBN(poolData.baseAmt)
    var A = _.getBN(poolData.tokenAmt)
    poolUnits = _.getBN((await sPool.totalSupply()))
    console.log('start data', _.BN2Str(S), _.BN2Str(A), _.BN2Str(poolUnits))

    let units = math.calcStakeUnits(a, A.plus(a), v, S.plus(v))
    console.log(_.BN2Str(units), _.BN2Str(v), _.BN2Str(S.plus(v)), _.BN2Str(a), _.BN2Str(A.plus(a)))
    
    let tx = await sRouter.stake(v, a, token.address, { from: acc})
    poolData = await utils.getPoolData(token.address);
    assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(S.plus(v)))
    assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(A.plus(a)))
    assert.equal(_.BN2Str(poolData.baseAmtStaked), _.BN2Str(S.plus(v)))
    assert.equal(_.BN2Str(poolData.tokenAmtStaked), _.BN2Str(A.plus(a)))
    assert.equal(_.BN2Str((await sPool.totalSupply())), _.BN2Str(units.plus(poolUnits)), 'poolUnits')
    assert.equal(_.BN2Str(await sPool.balanceOf(acc)), _.BN2Str(units), 'units')
    assert.equal(_.BN2Str(await sparta.balanceOf(sPool.address)), _.BN2Str(S.plus(v)), 'spartan balance')
    assert.equal(_.BN2Str(await token.balanceOf(sPool.address)), _.BN2Str(A.plus(a)), 'ether balance')

    let memberData = (await utils.getMemberData(token.address, acc))
    assert.equal(memberData.baseAmtStaked, v, 'baseAmt')
    assert.equal(memberData.tokenAmtStaked, a, 'tokenAmt')

    const tokenBal = _.BN2Token(await web3.eth.getBalance(sPool.address));
    const spartanBal = _.BN2Token(await sparta.balanceOf(sPool.address));
    console.log(`BALANCES: [ ${tokenBal} ETH | ${spartanBal} SPT ]`)
}


async function swapSPARTAToETH(acc, v) {

    it(`It should buy ETH with SPARTA from ${acc}`, async () => {
        let token = _.ETH
        let poolData = await utils.getPoolData(token);
        const V = _.getBN(poolData.baseAmt)
        const A = _.getBN(poolData.tokenAmt)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let a = math.calcSwapOutput(v, V, A)
        let fee = math.calcSwapFee(v, V, A)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await sRouter.buy(v, _.ETH)
        poolData = await utils.getPoolData(token);

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(V.plus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(sPoolETH.address)), _.BN2Str(A.minus(a)), 'ether balance')
        assert.equal(_.BN2Str(await sparta.balanceOf(sPoolETH.address)), _.BN2Str(V.plus(v)), 'spartan balance')

        await help.logPool(utils, _.ETH, 'ETH')
    })
}

async function swapETHToSPARTA(acc, a) {

    it(`It should sell ETH to SPARTA from ${acc}`, async () => {
        let token = _.ETH
        let poolData = await utils.getPoolData(token);
        const V = _.getBN(poolData.baseAmt)
        const A = _.getBN(poolData.tokenAmt)
        // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

        let v = math.calcSwapOutput(a, A, V)
        let fee = math.calcSwapFee(a, A, V)
        // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
        
        let tx = await sRouter.sell(a, _.ETH, { from: acc, value: a })
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(a))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(v))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(A.plus(a)))
        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(V.minus(v)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(sPoolETH.address)), _.BN2Str(A.plus(a)), 'ether balance')
        // assert.equal(_.BN2Str(await sparta.balanceOf(sPoolETH.address)), _.BN2Str(V.minus(v)), 'spartan balance')

        await help.logPool(utils, _.ETH, 'ETH')
    })
}

async function swapTKN1ToETH(acc, x) {
    it(`It should swap TKN1 to ETH from ${acc}`, async () => {
        await _swapTKNToETH(acc, x, token1, sPoolTKN1)
        await help.logPool(utils, token1.address, 'TKN1')
    })
}

async function swapTKN2ToETH(acc, x) {
    it(`It should swap TKN2 to ETH from ${acc}`, async () => {
        await _swapTKNToETH(acc, x, token2, sPoolTKN2)
        await help.logPool(utils, token2.address, 'TKN2')

    })
}

async function _swapTKNToETH(acc, x, token, sPool) {
    const toToken = _.ETH
    let poolData1 = await utils.getPoolData(token.address);
    let poolData2 = await utils.getPoolData(toToken);
    const X = _.getBN(poolData1.tokenAmt)
    const Y = _.getBN(poolData1.baseAmt)
    const V = _.getBN(poolData2.baseAmt)
    const Z = _.getBN(poolData2.tokenAmt)
    // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

    let y = math.calcSwapOutput(x, X, Y)
    let feey = math.calcSwapFee(x, X, Y)
    let z = math.calcSwapOutput(y, V, Z)
    let feez = math.calcSwapFee(y, V, Z)
    let fee = math.calcValueIn(feey, V.plus(y), Z.minus(z)).plus(feez)
    // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
    
    let tx = await sRouter.swap(x, token.address, toToken)
    poolData1 = await utils.getPoolData(token.address);
    poolData2 = await utils.getPoolData(toToken);

    assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.transferAmount), _.BN2Str(y))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(z))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))
    // assert.equal(_.BN2Str(tx.receipt.logs[4].args.inputAmount), _.BN2Str(y))
    // assert.equal(_.BN2Str(tx.receipt.logs[4].args.transferAmount), _.BN2Str(0))
    // assert.equal(_.BN2Str(tx.receipt.logs[4].args.outputAmount), _.BN2Str(z))
    // assert.equal(_.BN2Str(tx.receipt.logs[4].args.fee), _.BN2Str(feez))

    assert.equal(_.BN2Str(poolData1.tokenAmt), _.BN2Str(X.plus(x)))
    assert.equal(_.BN2Str(poolData1.baseAmt), _.BN2Str(Y.minus(y)))
    assert.equal(_.BN2Str(poolData2.baseAmt), _.BN2Str(V.plus(y)))
    assert.equal(_.BN2Str(poolData2.tokenAmt), _.BN2Str(Z.minus(z)))

    assert.equal(_.BN2Str(await token.balanceOf(sPool.address)), _.BN2Str(X.plus(x)), 'token1 balance')
    assert.equal(_.BN2Str(await sparta.balanceOf(sPool.address)), _.BN2Str(Y.minus(y)), 'spartan balance')
    assert.equal(_.BN2Str(await sparta.balanceOf(sPoolETH.address)), _.BN2Str(V.plus(y)), 'spartan balance eth')
    assert.equal(_.BN2Str(await web3.eth.getBalance(sPoolETH.address)), _.BN2Str(Z.minus(z)), 'ether balance')

    await help.logPool(utils, token.address, 'TKN1')
    await help.logPool(utils, _.ETH, 'ETH')
}

async function swapETHToTKN1(acc, x) {
    it(`It should sell ETH with TKN1 from ${acc}`, async () => {
        await _swapETHToTKN(acc, x, token1, sPoolTKN1)
        await help.logPool(utils, token1.address, 'TKN1')
    })
}

async function swapETHToTKN2(acc, x) {
    it(`It should sell ETH to TKN2 from ${acc}`, async () => {
        await _swapETHToTKN(acc, x, token2, sPoolTKN2)
        await help.logPool(utils, token2.address, 'TKN2')

    })
}

async function _swapETHToTKN(acc, x, token, sPool) {
    let poolData1 = await utils.getPoolData(_.ETH);
    let poolData2 = await utils.getPoolData(token.address);
    const X = _.getBN(poolData1.tokenAmt)
    const Y = _.getBN(poolData1.baseAmt)
    const V = _.getBN(poolData2.baseAmt)
    const Z = _.getBN(poolData2.tokenAmt)
    // console.log('start data', _.BN2Str(V), _.BN2Str(A), stakerCount, _.BN2Str(poolUnits))

    let y = math.calcSwapOutput(x, X, Y)
    let feey = math.calcSwapFee(x, X, Y)
    let z = math.calcSwapOutput(y, V, Z)
    let feez = math.calcSwapFee(y, V, Z)
    let fee = math.calcValueIn(feey, V.plus(y), Z.minus(z)).plus(feez)
    // console.log(_.BN2Str(a), _.BN2Str(A), _.BN2Str(V), _.BN2Str(v), _.BN2Str(fee))
    
    let tx = await sRouter.swap(x, _.ETH, token.address, {from:acc, value: x})
    poolData1 = await utils.getPoolData(_.ETH);
    poolData2 = await utils.getPoolData(token.address);

    assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.transferAmount), _.BN2Str(y))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(z))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

    assert.equal(_.BN2Str(poolData1.tokenAmt), _.BN2Str(X.plus(x)))
    assert.equal(_.BN2Str(poolData1.baseAmt), _.BN2Str(Y.minus(y)))
    assert.equal(_.BN2Str(poolData2.baseAmt), _.BN2Str(V.plus(y)))
    assert.equal(_.BN2Str(poolData2.tokenAmt), _.BN2Str(Z.minus(z)))

    assert.equal(_.BN2Str(await web3.eth.getBalance(sPoolETH.address)), _.BN2Str(X.plus(x)), 'token1 balance')
    assert.equal(_.BN2Str(await sparta.balanceOf(sPoolETH.address)), _.BN2Str(Y.minus(y)), 'spartan balance')
    assert.equal(_.BN2Str(await sparta.balanceOf(sPool.address)), _.BN2Str(V.plus(y)), 'spartan balance eth')
    assert.equal(_.BN2Str(await token.balanceOf(sPool.address)), _.BN2Str(Z.minus(z)), 'ether balance')

    await help.logPool(utils, token.address, 'TKN1')
    await help.logPool(utils, _.ETH, 'ETH')
}



async function unstakeETH(bp, acc) {

    it(`It should unstake ETH for ${acc}`, async () => {
        let poolROI = await utils.getPoolROI(_.ETH)
        console.log('poolROI-ETH', _.BN2Str(poolROI))
        let poolAge = await utils.getPoolAge(_.ETH)
        console.log('poolAge-ETH', _.BN2Str(poolAge))
        let poolAPY = await utils.getPoolAPY(_.ETH)
        console.log('poolAPY-ETH', _.BN2Str(poolAPY))
        let memberROI0 = await utils.getMemberROI(_.ETH, acc0)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await utils.getMemberROI(_.ETH, acc1)
        console.log('memberROI1', _.BN2Str(memberROI1))

        let poolData = await utils.getPoolData(_.ETH);
        var V = _.getBN(poolData.baseAmt)
        var A = _.getBN(poolData.tokenAmt)

        let totalUnits = _.getBN((await sPoolETH.totalSupply()))
        let stakerUnits = _.getBN(await sPoolETH.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)
        let v = _.floorBN((V.times(share)).div(totalUnits))
        let a = _.floorBN((A.times(share)).div(totalUnits))
        // let vs = poolData.spartaStaked
        // let as = poolData.tokenStaked
        // let vsShare = _.floorBN((V.times(share)).div(totalUnits))
        // let asShare = _.floorBN((A.times(share)).div(totalUnits))
        console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
        
        let tx = await sRouter.unstake(bp, _.ETH, { from: acc})
        poolData = await utils.getPoolData(_.ETH);

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(v), 'outputBase')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(a), 'outputToken')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await sPoolETH.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(V.minus(v)))
        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(A.minus(a)))
        // assert.equal(_.BN2Str(poolData.spartaStaked), _.BN2Str(V.minus(v)))
        // assert.equal(_.BN2Str(poolData.tokenStaked), _.BN2Str(A.minus(a)))
        assert.equal(_.BN2Str(await sparta.balanceOf(sPoolETH.address)), _.BN2Str(V.minus(v)), 'spartan balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(sPoolETH.address)), _.BN2Str(A.minus(a)), 'ether balance')

        let stakerUnits2 = _.getBN(await sPoolETH.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function unstakeTKN1(bp, acc) {

    it(`It should unstake TKN1 for ${acc}`, async () => {

        let poolROI = await utils.getPoolROI(token1.address)
        console.log('poolROI-TKN1', _.BN2Str(poolROI))
        let poolAge = await utils.getPoolAge(token1.address)
        console.log('poolAge-TKN1', _.BN2Str(poolAge))
        let poolAPY = await utils.getPoolAPY(token1.address)
        console.log('poolAPY-TKN1', _.BN2Str(poolAPY))
        let memberROI0 = await utils.getMemberROI(token1.address, acc0)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await utils.getMemberROI(token1.address, acc1)
        console.log('memberROI1', _.BN2Str(memberROI1))

        await _unstakeTKN(bp, acc, sPoolTKN1, token1)
        await help.logPool(utils, token1.address, 'TKN1')

    })
}

async function unstakeTKN2(bp, acc) {

    it(`It should unstake TKN2 for ${acc}`, async () => {
        let poolROI = await utils.getPoolROI(token2.address)
        console.log('poolROI-TKN2', _.BN2Str(poolROI))
        let poolAge = await utils.getPoolAge(token2.address)
        console.log('poolAge-TKN2', _.BN2Str(poolAge))
        let poolAPY = await utils.getPoolAPY(token2.address)
        console.log('poolAPY-TKN2', _.BN2Str(poolAPY))

        let memberROI0 = await utils.getMemberROI(token2.address, acc0)
        console.log('memberROI0', _.BN2Str(memberROI0))
        let memberROI1 = await utils.getMemberROI(token2.address, acc1)
        console.log('memberROI1', _.BN2Str(memberROI1))

        await _unstakeTKN(bp, acc, sPoolTKN2, token2)
        await help.logPool(utils, token2.address, 'TKN2')

    })
}

async function _unstakeTKN(bp, acc, pools, token) {
    let poolData = await utils.getPoolData(token.address);
    var V = _.getBN(poolData.baseAmt)
    var A = _.getBN(poolData.tokenAmt)

    let totalUnits = _.getBN((await pools.totalSupply()))
    let stakerUnits = _.getBN(await pools.balanceOf(acc))
    let share = (stakerUnits.times(bp)).div(10000)
    let v = _.floorBN((V.times(share)).div(totalUnits))
    let a = _.floorBN((A.times(share)).div(totalUnits))
    console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(v), _.BN2Str(a))
    
    let tx = await sRouter.unstake(bp, token.address, { from: acc})
    poolData = await utils.getPoolData(token.address);

    assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(v), 'outputBase')
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(a), 'outputToken')
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

    assert.equal(_.BN2Str((await pools.totalSupply())), _.BN2Str(totalUnits.minus(share)), 'poolUnits')

    assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(V.minus(v)))
    assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(A.minus(a)))
    // assert.equal(_.BN2Str(poolData.spartaStaked), _.BN2Str(V.minus(v)))
    // assert.equal(_.BN2Str(poolData.tokenStaked), _.BN2Str(A.minus(a)))
    assert.equal(_.BN2Str(await sparta.balanceOf(pools.address)), _.BN2Str(V.minus(v)), 'spartan balance')
    assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(A.minus(a)), 'token balance')

    let stakerUnits2 = _.getBN(await pools.balanceOf(acc))
    assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
}


async function logETH() {
    it("logs", async () => {
        // await help.logPool(utils, _.ETH, 'ETH')
    })
}
function logTKN1() {
    it("logs", async () => {
        // await help.logPool(utils, token1.address, 'TKN1')
    })
}function logTKN2() {
    it("logs", async () => {
        // await help.logPool(utils, token2.address, 'TKN2')
    })
}

function checkDetails() {
    it("checks details", async () => {

        console.log('tokenCount', _.BN2Str(await utils.tokenCount()))
        console.log('allTokens', (await utils.allTokens()))
        console.log('tokensInRange', (await utils.tokensInRange(0, 1)))
        console.log('tokensInRange', (await utils.tokensInRange(0, 2)))
        console.log('tokensInRange', (await utils.tokensInRange(0, 3)))
        console.log('tokensInRange', (await utils.tokensInRange(1, 2)))
        console.log('tokensInRange', (await utils.tokensInRange(1, 8)))
        console.log('allPools', (await utils.allPools()))
        console.log('poolsInRange', (await utils.poolsInRange(0, 1)))
        console.log('poolsInRange', (await utils.poolsInRange(1, 2)))
        console.log('poolsInRange', (await utils.poolsInRange(1, 8)))
        console.log('getGlobalDetails', (await utils.getTokenDetails(_.ETH)))
        console.log('getTokenDetails', (await utils.getTokenDetails(token1.address)))
        console.log('getTokenDetails', (await utils.getTokenDetails(token2.address)))
        console.log('getGlobalDetails', (await utils.getGlobalDetails()))
        console.log('getPoolData ETH', (await utils.getPoolData(_.ETH)))
        console.log('getPoolData TKN1', (await utils.getPoolData(token1.address)))
        console.log('getTokenDetails TKN2', (await utils.getPoolData(token2.address)))
    })
}

