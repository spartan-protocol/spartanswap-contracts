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
var UTILS = artifacts.require("./Utils.sol");

var base; var utils;
var acc0; var acc1; var acc2; var acc3;

contract('BASE', function (accounts) {
    constructor(accounts)
    mathCheck()
})


//################################################################
// CONSTRUCTION
function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]

    it("constructor events", async () => {

        base = await BASE.new()
        utils = await UTILS.new(base.address)
        console.log(`Acc0: ${acc0}`)
        console.log(`Acc1: ${acc1}`)
    });
}


async function mathCheck() {
    const t = _.getBN(1*10**18)
    const T = _.getBN(10*10**18)
    const b = _.getBN(10*10**18)
    const B = _.getBN(100*10**18)
    const share = _.getBN(1000)
    const total = _.getBN(10000)
    P = _.getBN(10*10**18)

    it(`Checks slipAdjustment`, async () => {
        let base = await utils.getSlipAdustment(b, B, t, T)
        let js = math.getSlipAdustment(b, B, t, T)
        assert.equal(_.BN2Str(base), _.BN2Str(js))
        assert.equal(_.BN2Str(base), _.getBN(1*10**18))
    })

    it(`Checks staking`, async () => {
        let base = await utils.calcStakeUnits(b, B, t, T, P)
        let js = math.calcStakeUnits(b, B, t, T, P)
        assert.equal(_.BN2Str(base), _.BN2Str(js))
        assert.equal(_.BN2Str(base), _.getBN(1*10**18))
    })

    it(`Checks slipAdjustment`, async () => {
        const b = _.getBN(10*10**18)
        const t = _.getBN(5*10**18)
        let base = await utils.getSlipAdustment(b, B, t, T)
        let js = math.getSlipAdustment(b, B, t, T)
        assert.equal(_.BN2Str(base), _.BN2Str(js))
        assert.equal(_.BN2Str(base), '777777777777777778')
    })

    it(`Checks staking`, async () => {
        const b = _.getBN(10*10**18)
        const t = _.getBN(5*10**18)
        let base = await utils.calcStakeUnits(b, B, t, T, P)
        let js = math.calcStakeUnits(b, B, t, T, P)
        assert.equal(_.BN2Str(base), _.BN2Str(js))
        assert.equal(_.BN2Str(base), '2333333333333333334')
    })

    it(`Checks assym withdrawal`, async () => {
        let base = await utils.calcAsymmetricShare(share, total, B)
        let js = math.calcAsymmetricShare(share, total, B)
        assert.equal(_.BN2Str(base), _.BN2Str(js))
        assert.equal(_.BN2Str(base), '18100000000000000000')
    })

    it(`Checks swapping`, async () => {
        let base = await utils.calcSwapOutput(t, T, B)
        let js = math.calcSwapOutput(t, T, B)
        assert.equal(_.BN2Str(base), _.BN2Str(js))
        assert.equal(_.BN2Str(base), '8264462809917355371')
    })

    it(`Checks swapping fee`, async () => {
        let base = await utils.calcSwapFee(t, T, B)
        let js = math.calcSwapFee(t, T, B)
        assert.equal(_.BN2Str(base), _.BN2Str(js))
        assert.equal(_.BN2Str(base), '826446280991735537')
        // console.log(_.BN2Str(base), _.BN2Str(js))
    })

    it(`Checks swapping fee`, async () => {
        const t = _.getBN(1000000000000000000)
        const T = _.getBN(100000000000000000)
        const B = _.getBN(10000000000000000000)
        let base = await utils.calcSwapFee(t, T, B)
        let js = math.calcSwapFee(t, T, B)
        assert.equal(_.BN2Str(base), _.BN2Str(js))
        assert.equal(_.BN2Str(base), '8264462809917355371')
        // console.log(_.BN2Str(base), _.BN2Str(js))
    })
}
