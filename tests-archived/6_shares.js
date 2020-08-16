var Sparta = artifacts.require("./Sparta.sol")
const BigNumber = require('bignumber.js')

var coin; var coinAddress
var acc0; var acc1; var acc2; var acc3; var acc4; var acc5;
var Era; var Day;
var event = {"era":"", "day":""}

const send1 = 1000;
const send2 = 2000;

const timeDelay = 1200;
const delay = ms => new Promise(res => setTimeout(res, ms));

//######################################################################################
// This test to ensure the contract splits shares every day properly
// Note this test is heavily dependent on time, so may fail on faster/slower machines
//######################################################################################


contract("Sparta", function (accounts) {

    constructor(accounts)

    //sendEther(acc0, send1)
    // two people send ether in the same era&day, need to split 67/33
    // Adjust milli-seconds delay in the withdrawal to ensure withare AFTER the day
    sendEther(acc0, send2)
    sendEther(acc1, send1)
    withdraw(acc0, 1, 1000)
    withdraw(acc1, 1, 0)

    // two people send ether in the same era&day, need to split 33/67
    // Adjust milli-seconds delay in the withdrawal to ensure withare AFTER the day
    sendEther(acc0, send2)
    sendEther(acc1, send1)
    withdraw(acc1, 1, 800)
    withdraw(acc0, 1, 0)
})


function constructor(accounts) {
    acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; acc3 = accounts[3]; acc4 = accounts[4]; acc5 = accounts[5];
    it("constructor events", async () => {
        let Sparta = artifacts.require("Sparta.sol");
        coin = await Sparta.new()
        coinAddress = coin.address;
        //console.log("coin:", coinAddress) 
        console.log("Note: This test is very difficult to pass at secondsPerDay = 1.",
            "Recommend recompiling the contract at secondsPerDay = 2, and running just this test")
        console.log("npx buidler test test/6_shares.js")
    });
}

async function sendEther(_acc, _val) {

    it("Acc sends Ether", async () => {
        let _era = await coin.currentEra.call()
        let _day = await coin.currentDay.call()
        console.log('Era%s Day%s', _era, _day)
        event = {"era":_era, "day":_day}
        let tx = await coin.send(_val, { from: _acc })
        //Era = await coin.currentEra.call(); Day = await coin.currentDay.call()
        //console.log(tx.logs[0].args.member, tx.logs[0].args.member, tx.logs[0].args.era, tx.logs[0].args.day, tx.logs[0].event); 
        //console.log('Tx: %s Sent from Acc: %s', tx.receipt.transactionHash, _acc)
        
    })
}

async function withdraw(_acc, _day, _time) {
    it("Acc withdraws", async () => {
        await delay(_time)

        let _era = event.era; let _day = event.day

        let balStart = (new BigNumber(await coin.balanceOf(_acc))).toFixed()
        let _emission = (new BigNumber(await coin.mapEraDay_EmissionRemaining.call(_era, _day))).toFixed()
        let _memberUnits = (new BigNumber(await coin.mapEraDay_MemberUnits.call(_era, _day, _acc))).toFixed()
        let _totalUnits = (new BigNumber(await coin.mapEraDay_UnitsRemaining.call(_era, _day))).toFixed()
        let share = ((_emission * _memberUnits) / _totalUnits).toFixed(0)
        if (share == "NaN"){
            share = 0
        }
        console.log("memberUnits %s totalUnits %s", _memberUnits, _totalUnits)
        //console.log("_era, _day", _era, _day)

        let contractShare = await coin.getEmissionShare(_era, _day, _acc)
        console.log('Caculated: %s Contract: %s', share, contractShare)
        assert.equal(contractShare, share, "shares are correct")
        
        let tx = await coin.withdrawShare(_era, _day, { from: _acc })
        //console.log('Tx: %s Sent from Acc: %s', tx.receipt.transactionHash, _acc)
        //Era = await coin.currentEra.call(); Day = await coin.currentDay.call()
        //console.log("withdrew in: Era: %s, Day: %s", Era, Day)

        let balBN = new BigNumber(await coin.balanceOf(_acc))
        assert.equal(balBN.toFixed(), +balStart + +contractShare, "correct acc bal")
        //console.log("balance", balBN.toFixed())

        let units = await coin.mapEraDay_MemberUnits.call(_era, _day, _acc);
        assert.equal(units, "0", "the units is correct");

        let unitsRemaining = (new BigNumber(await coin.mapEraDay_UnitsRemaining.call(_era, _day))).toFixed();
        //console.log("_memberUnits, unitsRemaining, _totalUnits", _memberUnits, unitsRemaining, _totalUnits)
        assert.equal(unitsRemaining, (_totalUnits-_memberUnits), "the total units is correct");

        let valueShare = (new BigNumber(await coin.getEmissionShare(_era, _day, _acc))).toFixed();
        assert.equal(valueShare, "0", "the value share is correct");

        let valueLeft = (new BigNumber(await coin.mapEraDay_EmissionRemaining.call(_era, _day))).toFixed();
        //console.log("_emission, share, valueLeft", _emission, share, valueLeft)
        assert.equal(valueLeft, (_emission - +share), "the value is correct");

        let coinBal1 = await coin.balanceOf(coinAddress);
        //console.log("coinBal1", coinBal1.toNumber());

    })

}