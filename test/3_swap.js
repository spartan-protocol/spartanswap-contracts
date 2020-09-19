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

var BASE = artifacts.require("./BaseMinted.sol");
var DAO = artifacts.require("./Dao.sol");
var ROUTER = artifacts.require("./Router.sol");
var POOL = artifacts.require("./Pool.sol");
var UTILS = artifacts.require("./Utils.sol");
var TOKEN1 = artifacts.require("./Token1.sol");

var base; var token1;  var token2; var addr1; var addr2;
var utils; var router; var Dao;
var poolETH; var poolTKN1; var poolTKN2;
var acc0; var acc1; var acc2; var acc3;

contract('SWAP', function (accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]
    createPool()
    // checkDetails()
    addLiquidity(acc1, _.BN2Str(_.one * 10), _.dot1BN)
    // checkDetails()

    // Single swap
    swapBASEToETH(acc0, _.BN2Str(_.one * 10))
    // checkDetails()
    swapETHToBASE(acc0, _.BN2Str(_.one * 1))
    // checkDetails()

    stakeTKN1(acc1, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100))
    // checkDetails()

    // // Double swap
    swapTKN1ToETH(acc0, _.BN2Str(_.one * 10))
    // checkDetails()
    swapETHToTKN1(acc0, _.BN2Str(_.one * 1))
    // checkDetails()

    stakeTKN2(acc1, _.BN2Str(_.one * 10), _.BN2Str(_.one * 100))
    // checkDetails()

    // // // // // Double swap back
    swapTKN2ToETH(acc0, _.BN2Str(_.one * 10))
    // checkDetails()
    swapETHToTKN2(acc0, _.BN2Str(_.one * 1))
    // checkDetails()

    removeETH(10000, acc1)
    // checkDetails()
    removeTKN1(10000, acc1)
    // checkDetails()
    removeTKN2(10000, acc1)
    // checkDetails()
    removeETH(10000, acc0)
    // checkDetails()
    removeTKN1(10000, acc0)
    // checkDetails()
    unstakeTKN2(10000, acc0)
    // checkDetails()

})

before(async function() {
    accounts = await ethers.getSigners();
    acc0 = await accounts[0].getAddress(); 
    acc1 = await accounts[1].getAddress(); 
    acc2 = await accounts[2].getAddress(); 
    acc3 = await accounts[3].getAddress()

    base = await BASE.new()
    utils = await UTILS.new(base.address)
    Dao = await DAO.new(base.address)
    router = await ROUTER.new(base.address)
    await base.changeDAO(Dao.address)
    await Dao.setGenesisAddresses(router.address, utils.address)
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

    await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
    await base.transfer(acc1, _.getBN(_.BN2Str(100000 * _.one)))
    await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc0 })
    await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc1 })
    await base.approve(router.address, _.BN2Str(500000 * _.one), { from: acc2 })

    let supplyT1 = await token1.totalSupply()
    await token1.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
    await token2.transfer(acc1, _.getBN(_.BN2Int(supplyT1)/2))
    await token1.approve(router.address, supplyT1, { from: acc0 })
    await token1.approve(router.address, supplyT1, { from: acc1 })
    await token2.approve(router.address, supplyT1, { from: acc0 })
    await token2.approve(router.address, supplyT1, { from: acc1 })
})

async function createPool() {
    it("It should deploy Eth Pool", async () => {
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.dot1BN, _.BNB, { value: _.dot1BN })
        await router.createPool(_.BN2Str(_.one * 10), _.dot1BN, _.BNB, { value: _.dot1BN })
        poolETH = await POOL.at(_pool)
        //console.log(`Pools: ${poolETH.address}`)
        const baseAddr = await poolETH.BASE()
        assert.equal(baseAddr, base.address, "address is correct")
        assert.equal(_.BN2Str(await base.balanceOf(poolETH.address)), _.BN2Str(_.one * 10), 'base balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(poolETH.address)), _.BN2Str(_.dot1BN), 'ether balance')

        let supply = await base.totalSupply()
        await base.approve(poolETH.address, supply, { from: acc0 })
        await base.approve(poolETH.address, supply, { from: acc1 })
    })

    it("It should deploy TKN1 Pools", async () => {

        await token1.approve(router.address, '-1', { from: acc0 })
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token1.address)
        poolTKN1 = await POOL.at(_pool)
        //console.log(`Pools1: ${poolTKN1.address}`)
        const baseAddr = await poolTKN1.BASE()
        assert.equal(baseAddr, base.address, "address is correct")

        await base.approve(poolTKN1.address, '-1', { from: acc0 })
        await base.approve(poolTKN1.address, '-1', { from: acc1 })
        await token1.approve(poolTKN1.address, '-1', { from: acc0 })
        await token1.approve(poolTKN1.address, '-1', { from: acc1 })
    })
    it("It should deploy TKN2 Pools", async () => {

        await token2.approve(router.address, '-1', { from: acc0 })
        var _pool = await router.createPool.call(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        await router.createPool(_.BN2Str(_.one * 10), _.BN2Str(_.one * 100), token2.address)
        poolTKN2 = await POOL.at(_pool)
        //console.log(`Pools2: ${poolTKN2.address}`)
        const baseAddr = await poolTKN2.BASE()
        assert.equal(baseAddr, base.address, "address is correct")

        await base.approve(poolTKN2.address, '-1', { from: acc0 })
        await base.approve(poolTKN2.address, '-1', { from: acc1 })
        await token2.approve(poolTKN2.address, '-1', { from: acc0 })
        await token2.approve(poolTKN2.address, '-1', { from: acc1 })
    })
}

async function addLiquidity(acc, b, t) {

    it(`It should addLiquidity BNB from ${acc}`, async () => {
        let token = _.BNB
        let pool = poolETH
        let poolData = await utils.getPoolData(token);
        var S = _.getBN(poolData.baseAmt)
        var T = _.getBN(poolData.tokenAmt)
        poolUnits = _.getBN((await pool.totalSupply()))
        //console.log('start data', _.BN2Str(S), _.BN2Str(T), _.BN2Str(poolUnits))

        let units = math.calcStakeUnits(b, S, t, T, poolUnits)
        //console.log(_.BN2Str(units), _.BN2Str(b), _.BN2Str(S), _.BN2Str(t), _.BN2Str(T))
        
        let tx = await router.addLiquidity(b, t, token, { from: acc, value: t })
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(S.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str(poolData.baseAmtStaked), _.BN2Str(S.plus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmtStaked), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str((await pool.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
        assert.equal(_.BN2Str(await pool.balanceOf(acc)), _.BN2Str(units), 'units')
        assert.equal(_.BN2Str(await base.balanceOf(pool.address)), _.BN2Str(S.plus(b)), 'base balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(pool.address)), _.BN2Str(T.plus(t)), 'ether balance')

        // let memberData = (await utils.getMemberData(token, acc))
        // assert.equal(memberData.baseAmtStaked, b, 'baseAmt')
        // assert.equal(memberData.tokenAmtStaked, t, 'tokenAmt')

        const tokenBal = _.BN2Token(await web3.eth.getBalance(pool.address));
        const baseBal = _.BN2Token(await base.balanceOf(pool.address));
        //console.log(`BALANCES: [ ${tokenBal} BNB | ${baseBal} SPT ]`)
    })
}

async function stakeTKN1(acc, t, b) {
    it(`It should addLiquidity TKN1 from ${acc}`, async () => {
        await _stakeTKN(acc, t, b, token1, poolTKN1)
        //await help.logPool(utils, token1.address, 'TKN1')
    })
}
async function stakeTKN2(acc, t, b) {
    it(`It should addLiquidity TKN2 from ${acc}`, async () => {
        await _stakeTKN(acc, t, b, token2, poolTKN2)
        //await help.logPool(utils, token2.address, 'TKN2')
    })
}

async function _stakeTKN(acc, t, b, token, pool) {
    let poolData = await utils.getPoolData(token.address);
    var S = _.getBN(poolData.baseAmt)
    var T = _.getBN(poolData.tokenAmt)
    poolUnits = _.getBN((await pool.totalSupply()))
    //console.log('start data', _.BN2Str(S), _.BN2Str(T), _.BN2Str(poolUnits))

    let units = math.calcStakeUnits( b, S, t, T, poolUnits)
    //console.log(_.BN2Str(units), _.BN2Str(b), _.BN2Str(S.plus(b)), _.BN2Str(t), _.BN2Str(T.plus(t)))
    
    let tx = await router.addLiquidity(b, t, token.address, { from: acc})
    poolData = await utils.getPoolData(token.address);
    assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(S.plus(b)))
    assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(T.plus(t)))
    assert.equal(_.BN2Str(poolData.baseAmtStaked), _.BN2Str(S.plus(b)))
    assert.equal(_.BN2Str(poolData.tokenAmtStaked), _.BN2Str(T.plus(t)))
    assert.equal(_.BN2Str((await pool.totalSupply())), _.BN2Str(poolUnits.plus(units)), 'poolUnits')
    assert.equal(_.BN2Str(await pool.balanceOf(acc)), _.BN2Str(units), 'units')
    assert.equal(_.BN2Str(await base.balanceOf(pool.address)), _.BN2Str(S.plus(b)), 'base balance')
    assert.equal(_.BN2Str(await token.balanceOf(pool.address)), _.BN2Str(T.plus(t)), 'ether balance')

    // let memberData = (await utils.getMemberData(token.address, acc))
    // assert.equal(memberData.baseAmtStaked, b, 'baseAmt')
    // assert.equal(memberData.tokenAmtStaked, t, 'tokenAmt')

    const tokenBal = _.BN2Token(await web3.eth.getBalance(pool.address));
    const baseBal = _.BN2Token(await base.balanceOf(pool.address));
    //console.log(`BALANCES: [ ${tokenBal} BNB | ${baseBal} SPT ]`)
}


async function swapBASEToETH(acc, b) {

    it(`It should buy BNB with BASE from ${acc}`, async () => {
        let token = _.BNB
        let poolData = await utils.getPoolData(token);
        const B = _.getBN(poolData.baseAmt)
        const T = _.getBN(poolData.tokenAmt)
        //console.log('start data', _.BN2Str(B), _.BN2Str(T))

        let t = math.calcSwapOutput(b, B, T)
        let fee = math.calcSwapFee(b, B, T)
        //console.log(_.BN2Str(t), _.BN2Str(T), _.BN2Str(B), _.BN2Str(b), _.BN2Str(fee))
        
        let tx = await router.buy(b, _.BNB)
        poolData = await utils.getPoolData(token);

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(b))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(t))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(T.minus(t)))
        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(B.plus(b)))

        assert.equal(_.BN2Str(await web3.eth.getBalance(poolETH.address)), _.BN2Str(T.minus(t)), 'ether balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolETH.address)), _.BN2Str(B.plus(b)), 'base balance')

        //await help.logPool(utils, _.BNB, 'BNB')
    })
}

async function swapETHToBASE(acc, t) {

    it(`It should sell BNB to BASE from ${acc}`, async () => {
        let token = _.BNB
        //await help.logPool(utils, token, 'BNB')
        let poolData = await utils.getPoolData(token);
        const B = _.getBN(poolData.baseAmt)
        const T = _.getBN(poolData.tokenAmt)
        // //console.log('start data', _.BN2Str(B), _.BN2Str(T), stakerCount, _.BN2Str(poolUnits))
        //console.log(poolData)

        let b = math.calcSwapOutput(t, T, B)
        let fee = math.calcSwapFee(t, T, B)
        //console.log(_.BN2Str(t), _.BN2Str(T), _.BN2Str(B), _.BN2Str(b), _.BN2Str(fee))
        
        let tx = await router.sell(t, token, { from: acc, value: t })
        poolData = await utils.getPoolData(token);
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(t))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(b))
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))
        //console.log(poolData)
        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(T.plus(t)))
        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(B.minus(b)))
        


        assert.equal(_.BN2Str(await web3.eth.getBalance(poolETH.address)), _.BN2Str(T.plus(t)), 'ether balance')
        assert.equal(_.BN2Str(await base.balanceOf(poolETH.address)), _.BN2Str(B.minus(b)), 'base balance')

        //await help.logPool(utils, token, 'BNB')
    })
}

async function swapTKN1ToETH(acc, x) {
    it(`It should swap TKN1 to BNB from ${acc}`, async () => {
        await _swapTKNToETH(acc, x, token1, poolTKN1)
        //await help.logPool(utils, token1.address, 'TKN1')
    })
}

async function swapTKN2ToETH(acc, x) {
    it(`It should swap TKN2 to BNB from ${acc}`, async () => {
        await _swapTKNToETH(acc, x, token2, poolTKN2)
        //await help.logPool(utils, token2.address, 'TKN2')

    })
}

async function _swapTKNToETH(acc, x, token, pool) {
    const toToken = _.BNB
    let poolData1 = await utils.getPoolData(token.address);
    let poolData2 = await utils.getPoolData(toToken);
    const X = _.getBN(poolData1.tokenAmt)
    const Y = _.getBN(poolData1.baseAmt)
    const B = _.getBN(poolData2.baseAmt)
    const Z = _.getBN(poolData2.tokenAmt)
    // //console.log('start data', _.BN2Str(B), _.BN2Str(T), stakerCount, _.BN2Str(poolUnits))

    let y = math.calcSwapOutput(x, X, Y)
    let feey = math.calcSwapFee(x, X, Y)
    let z = math.calcSwapOutput(y, B, Z)
    let feez = math.calcSwapFee(y, B, Z)
    let fee = math.calcValueIn(feey, B.plus(y), Z.minus(z)).plus(feez)
    // //console.log(_.BN2Str(t), _.BN2Str(T), _.BN2Str(B), _.BN2Str(b), _.BN2Str(fee))
    
    let tx = await router.swap(x, token.address, toToken)
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
    assert.equal(_.BN2Str(poolData2.baseAmt), _.BN2Str(B.plus(y)))
    assert.equal(_.BN2Str(poolData2.tokenAmt), _.BN2Str(Z.minus(z)))

    assert.equal(_.BN2Str(await token.balanceOf(pool.address)), _.BN2Str(X.plus(x)), 'token1 balance')
    assert.equal(_.BN2Str(await base.balanceOf(pool.address)), _.BN2Str(Y.minus(y)), 'base balance')
    assert.equal(_.BN2Str(await base.balanceOf(poolETH.address)), _.BN2Str(B.plus(y)), 'base balance eth')
    assert.equal(_.BN2Str(await web3.eth.getBalance(poolETH.address)), _.BN2Str(Z.minus(z)), 'ether balance')

    //await help.logPool(utils, token.address, 'TKN1')
    //await help.logPool(utils, _.BNB, 'BNB')
}

async function swapETHToTKN1(acc, x) {
    it(`It should sell BNB with TKN1 from ${acc}`, async () => {
        await _swapETHToTKN(acc, x, token1, poolTKN1)
        //await help.logPool(utils, token1.address, 'TKN1')
    })
}

async function swapETHToTKN2(acc, x) {
    it(`It should sell BNB to TKN2 from ${acc}`, async () => {
        await _swapETHToTKN(acc, x, token2, poolTKN2)
        //await help.logPool(utils, token2.address, 'TKN2')

    })
}

async function _swapETHToTKN(acc, x, token, pool) {
    let poolData1 = await utils.getPoolData(_.BNB);
    let poolData2 = await utils.getPoolData(token.address);
    const X = _.getBN(poolData1.tokenAmt)
    const Y = _.getBN(poolData1.baseAmt)
    const B = _.getBN(poolData2.baseAmt)
    const Z = _.getBN(poolData2.tokenAmt)
    // //console.log('start data', _.BN2Str(B), _.BN2Str(T), stakerCount, _.BN2Str(poolUnits))

    let y = math.calcSwapOutput(x, X, Y)
    let feey = math.calcSwapFee(x, X, Y)
    let z = math.calcSwapOutput(y, B, Z)
    let feez = math.calcSwapFee(y, B, Z)
    let fee = math.calcValueIn(feey, B.plus(y), Z.minus(z)).plus(feez)
    // //console.log(_.BN2Str(t), _.BN2Str(T), _.BN2Str(B), _.BN2Str(b), _.BN2Str(fee))
    
    let tx = await router.swap(x, _.BNB, token.address, {from:acc, value: x})
    poolData1 = await utils.getPoolData(_.BNB);
    poolData2 = await utils.getPoolData(token.address);

    assert.equal(_.BN2Str(tx.receipt.logs[0].args.inputAmount), _.BN2Str(x))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.transferAmount), _.BN2Str(y))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputAmount), _.BN2Str(z))
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.fee), _.BN2Str(fee))

    assert.equal(_.BN2Str(poolData1.tokenAmt), _.BN2Str(X.plus(x)))
    assert.equal(_.BN2Str(poolData1.baseAmt), _.BN2Str(Y.minus(y)))
    assert.equal(_.BN2Str(poolData2.baseAmt), _.BN2Str(B.plus(y)))
    assert.equal(_.BN2Str(poolData2.tokenAmt), _.BN2Str(Z.minus(z)))

    assert.equal(_.BN2Str(await web3.eth.getBalance(poolETH.address)), _.BN2Str(X.plus(x)), 'token1 balance')
    assert.equal(_.BN2Str(await base.balanceOf(poolETH.address)), _.BN2Str(Y.minus(y)), 'base balance')
    assert.equal(_.BN2Str(await base.balanceOf(pool.address)), _.BN2Str(B.plus(y)), 'base balance eth')
    assert.equal(_.BN2Str(await token.balanceOf(pool.address)), _.BN2Str(Z.minus(z)), 'ether balance')

    //await help.logPool(utils, token.address, 'TKN1')
    //await help.logPool(utils, _.BNB, 'BNB')
}



async function removeETH(bp, acc) {

    it(`It should removeLiquidity BNB for ${acc}`, async () => {
        let poolROI = await utils.getPoolROI(_.BNB)
        //console.log('poolROI-BNB', _.BN2Str(poolROI))
        let poolAge = await utils.getPoolAge(_.BNB)
        //console.log('poolAge-BNB', _.BN2Str(poolAge))
        let poolAPY = await utils.getPoolAPY(_.BNB)
        //console.log('poolAPY-BNB', _.BN2Str(poolAPY))
        // let memberROI0 = await utils.getMemberROI(_.BNB, acc0)
        // //console.log('memberROI0', _.BN2Str(memberROI0))
        // let memberROI1 = await utils.getMemberROI(_.BNB, acc1)
        // //console.log('memberROI1', _.BN2Str(memberROI1))

        let poolData = await utils.getPoolData(_.BNB);
        var B = _.getBN(poolData.baseAmt)
        var T = _.getBN(poolData.tokenAmt)

        let totalUnits = _.getBN((await poolETH.totalSupply()))
        let stakerUnits = _.getBN(await poolETH.balanceOf(acc))
        let share = (stakerUnits.times(bp)).div(10000)
        let b = _.floorBN((B.times(share)).div(totalUnits))
        let t = _.floorBN((T.times(share)).div(totalUnits))
        // let vs = poolData.baseStaked
        // let as = poolData.tokenStaked
        // let vsShare = _.floorBN((B.times(share)).div(totalUnits))
        // let asShare = _.floorBN((T.times(share)).div(totalUnits))
        //console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(b), _.BN2Str(t))
        
        let tx = await router.removeLiquidity(bp, _.BNB, { from: acc})
        poolData = await utils.getPoolData(_.BNB);

        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(b), 'outputBase')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(t), 'outputToken')
        assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

        assert.equal(_.BN2Str((await poolETH.totalSupply())), totalUnits.minus(share), 'poolUnits')

        assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(B.minus(b)))
        assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(T.minus(t)))
        // assert.equal(_.BN2Str(poolData.baseStaked), _.BN2Str(B.minus(b)))
        // assert.equal(_.BN2Str(poolData.tokenStaked), _.BN2Str(T.minus(t)))
        assert.equal(_.BN2Str(await base.balanceOf(poolETH.address)), _.BN2Str(B.minus(b)), 'base balance')
        assert.equal(_.BN2Str(await web3.eth.getBalance(poolETH.address)), _.BN2Str(T.minus(t)), 'ether balance')

        let stakerUnits2 = _.getBN(await poolETH.balanceOf(acc))
        assert.equal(_.BN2Str(stakerUnits2), _.BN2Str(stakerUnits.minus(share)), 'stakerUnits')
    })
}

async function removeTKN1(bp, acc) {

    it(`It should removeLiquidity TKN1 for ${acc}`, async () => {

        let poolROI = await utils.getPoolROI(token1.address)
        //console.log('poolROI-TKN1', _.BN2Str(poolROI))
        let poolAge = await utils.getPoolAge(token1.address)
        //console.log('poolAge-TKN1', _.BN2Str(poolAge))
        let poolAPY = await utils.getPoolAPY(token1.address)
        //console.log('poolAPY-TKN1', _.BN2Str(poolAPY))
        // let memberROI0 = await utils.getMemberROI(token1.address, acc0)
        // //console.log('memberROI0', _.BN2Str(memberROI0))
        // let memberROI1 = await utils.getMemberROI(token1.address, acc1)
        // //console.log('memberROI1', _.BN2Str(memberROI1))

        await _unstakeTKN(bp, acc, poolTKN1, token1)
        //await help.logPool(utils, token1.address, 'TKN1')

    })
}

async function removeTKN2(bp, acc) {

    it(`It should removeLiquidity TKN2 for ${acc}`, async () => {
        let poolROI = await utils.getPoolROI(token2.address)
        //console.log('poolROI-TKN2', _.BN2Str(poolROI))
        let poolAge = await utils.getPoolAge(token2.address)
        //console.log('poolAge-TKN2', _.BN2Str(poolAge))
        let poolAPY = await utils.getPoolAPY(token2.address)
        //console.log('poolAPY-TKN2', _.BN2Str(poolAPY))

        // let memberROI0 = await utils.getMemberROI(token2.address, acc0)
        // //console.log('memberROI0', _.BN2Str(memberROI0))
        // let memberROI1 = await utils.getMemberROI(token2.address, acc1)
        // //console.log('memberROI1', _.BN2Str(memberROI1))

        await _unstakeTKN(bp, acc, poolTKN2, token2)
        //await help.logPool(utils, token2.address, 'TKN2')

    })
}

async function _removeTKN(bp, acc, pools, token) {
    let poolData = await utils.getPoolData(token.address);
    var B = _.getBN(poolData.baseAmt)
    var T = _.getBN(poolData.tokenAmt)

    let totalUnits = _.getBN((await pools.totalSupply()))
    let stakerUnits = _.getBN(await pools.balanceOf(acc))
    let share = (stakerUnits.times(bp)).div(10000)
    let b = _.floorBN((B.times(share)).div(totalUnits))
    let t = _.floorBN((T.times(share)).div(totalUnits))
    //console.log(_.BN2Str(totalUnits), _.BN2Str(stakerUnits), _.BN2Str(share), _.BN2Str(b), _.BN2Str(t))
    
    let tx = await router.removeLiquidity(bp, token.address, { from: acc})
    poolData = await utils.getPoolData(token.address);

    assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputBase), _.BN2Str(b), 'outputBase')
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.outputToken), _.BN2Str(t), 'outputToken')
    assert.equal(_.BN2Str(tx.receipt.logs[0].args.unitsClaimed), _.BN2Str(share), 'unitsClaimed')

    assert.equal(_.BN2Str((await pools.totalSupply())), _.BN2Str(totalUnits.minus(share)), 'poolUnits')

    assert.equal(_.BN2Str(poolData.baseAmt), _.BN2Str(B.minus(b)))
    assert.equal(_.BN2Str(poolData.tokenAmt), _.BN2Str(T.minus(t)))
    // assert.equal(_.BN2Str(poolData.baseStaked), _.BN2Str(B.minus(b)))
    // assert.equal(_.BN2Str(poolData.tokenStaked), _.BN2Str(T.minus(t)))
    assert.equal(_.BN2Str(await base.balanceOf(pools.address)), _.BN2Str(B.minus(b)), 'base balance')
    assert.equal(_.BN2Str(await token.balanceOf(pools.address)), _.BN2Str(T.minus(t)), 'token balance')

    let liquidityUnits2 = _.getBN(await pools.balanceOf(acc))
    assert.equal(_.BN2Str(liquidityUnits2), _.BN2Str(liquidityUnits.minus(share)), 'liquidityUnits')
}


async function logETH() {
    it("logs", async () => {
        // //await help.logPool(utils, _.BNB, 'BNB')
    })
}
function logTKN1() {
    it("logs", async () => {
        // //await help.logPool(utils, token1.address, 'TKN1')
    })
}function logTKN2() {
    it("logs", async () => {
        // //await help.logPool(utils, token2.address, 'TKN2')
    })
}

function checkDetails() {
    it("checks details", async () => {

        //console.log('tokenCount', _.BN2Str(await utils.tokenCount()))
        //console.log('allTokens', (await utils.allTokens()))
        //console.log('tokensInRange', (await utils.tokensInRange(0, 1)))
        //console.log('tokensInRange', (await utils.tokensInRange(0, 2)))
        //console.log('tokensInRange', (await utils.tokensInRange(0, 3)))
        //console.log('tokensInRange', (await utils.tokensInRange(1, 2)))
        //console.log('tokensInRange', (await utils.tokensInRange(1, 8)))
        //console.log('allPools', (await utils.allPools()))
        //console.log('poolsInRange', (await utils.poolsInRange(0, 1)))
        //console.log('poolsInRange', (await utils.poolsInRange(1, 2)))
        //console.log('poolsInRange', (await utils.poolsInRange(1, 8)))
        //console.log('getGlobalDetails', (await utils.getTokenDetails(_.BNB)))
        //console.log('getTokenDetails', (await utils.getTokenDetails(token1.address)))
        //console.log('getTokenDetails', (await utils.getTokenDetails(token2.address)))
        //console.log('getGlobalDetails', (await utils.getGlobalDetails()))
        //console.log('getPoolData BNB', (await utils.getPoolData(_.BNB)))
        //console.log('getPoolData TKN1', (await utils.getPoolData(token1.address)))
        //console.log('getTokenDetails TKN2', (await utils.getPoolData(token2.address)))
    })
}
