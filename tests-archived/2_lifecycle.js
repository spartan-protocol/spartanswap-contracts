var Sparta = artifacts.require("./Sparta.sol")
const BigNumber = require('bignumber.js')

var coin; var coinAddress
var acc0; var acc1; var acc2;

const Emission = '2048'; 
const Supply = "8190"; 
const DaysPerEra = '2'; const SecondsPerDay = 1; 

const EmissionN = Emission.toString();
const sendEth = 1000;
const deposit = sendEth.toString()
const totalBurnt = 33000; const totalFees = 3;

const timeDelay = 1100;
const delay = ms => new Promise(res => setTimeout(res, ms));
function BN2Str(BN) { return (new BigNumber(BN)).toFixed() }

//######################################################################################
// This test checks a full lifecyle of Sparta contract with just Ether
// Ether is sent for all Eras then withdrawn
// Sparta is then transfered to test the contract's fee
// Ether is then sent in to ensure Fee Era testing
// Finally everything is checked
//######################################################################################

contract("Sparta", function(accounts) {
  constructor(accounts)
  sendEther()
  withdraws()
  transfer()
  sendAgain()
  checkTotals()
})

function constructor(accounts) {
  acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2];
  it("constructor events", async () => {
    let Sparta = artifacts.require("Sparta.sol");
    coin = await Sparta.new()
    coinAddress = coin.address;
    console.log("coin:", coinAddress) 
  });
}

function sendEther() {

    it("Acc0 sends Ether", async () => {
      await delay(1100);
      
      let _acc = acc0;
      var _era; var _day;

      var i = 0
      do {
        _era = await coin.currentEra(); _day = await coin.currentDay();
        let _emission = BN2Str(await coin.emission())
        await delay(timeDelay);
        let receipt = await coin.send(sendEth, { from: _acc})
        //console.log("logs:%s - first:%s", receipt.logs.length, receipt.logs[0].event); 
        console.log('Era: %s - Day: %s - Emission: %s', _era, _day, _emission)

        let units = await coin.mapEraDay_MemberUnits.call(_era, _day, _acc);
        assert.equal(units, deposit, "the units is correct");

        let totalUnits = await coin.mapEraDay_Units.call(_era, _day);
        assert.equal(totalUnits, deposit, "the total units is correct");

        let valueShare = await coin.getEmissionShare(_era, _day, _acc);
        //console.log(BN2Str(valueShare))
        assert.equal(BN2Str(valueShare), _emission, "the value share is correct");

        let valueLeft = await coin.mapEraDay_Emission.call(_era, _day);
        assert.equal(valueLeft, _emission, "the value left is correct");

        let coinBal1 = new BigNumber(await coin.balanceOf(coinAddress)).toFixed();
        //console.log("coinBal1", coinBal1);

        i++
        _day++
        if(_day > DaysPerEra) {
          _era++
          _emission = _emission/2
          _day = 1;
        }
      }
      while (_era < 13); 
    })
}

function withdraws() {

     it("Acc0 withdraws", async () => {

      let _acc = acc0;
      let _era = 1; let _day = 1;
      let _emission = EmissionN
      let _bal = _emission

      var i = 0
      do {
       
        let receipt = await coin.withdrawShare(_era, _day, { from: _acc })
        // console.log("blocknumber:", receipt.logs[0].blockNumber);
        // console.log("logs:%s - first:%s", receipt.logs.length, receipt.logs[0].event); 
        // console.log('Era:%s - Day:%s', _era, _day)
        // console.log('Emission:%s - Bal:%s', _emission, _bal)

        let balBN = new BigNumber(await coin.balanceOf(_acc))
        assert.equal(balBN.toFixed(), _bal, "correct acc bal")

        let units = BN2Str(await coin.mapEraDay_MemberUnits.call(_era, _day, _acc))
        assert.equal(units, "0", "the units is correct");

        let totalUnits = await coin.mapEraDay_UnitsRemaining.call(_era, _day);
        assert.equal(totalUnits, "0", "the total units is correct");

        let valueShare = await coin.getEmissionShare(_era, _day, _acc);
        assert.equal(valueShare, "0", "the value share is correct");

        let valueLeft = await coin.mapEraDay_EmissionRemaining.call(_era, _day);
        assert.equal(valueLeft, "0", "the value left is correct");

        let coinBal1 = await coin.balanceOf(coinAddress);
        console.log("Coin Balance", coinBal1.toNumber());

        i++
        _day++
        if(_day > DaysPerEra) {
          _era++
          _emission = _emission/2
          _day = 1;
        }
        _bal = (+_bal + +_emission).toString()
      }
      while (_era < 13); 
      let balBN = new BigNumber(await coin.balanceOf(_acc))
      assert.equal(balBN.toFixed(), Supply, "correct acc2 bal")
      console.log('Final User Balance: ', balBN.toFixed())
 })
}

function transfer() {
  it("allows a transfer between accounts for Gas", async () => {

    let coinBal1 = await coin.balanceOf(coinAddress);
    console.log("Coin Balance Start:", coinBal1.toNumber());
    let acc0Bal1 = await coin.balanceOf(acc0);
    let acc1Bal1 = await coin.balanceOf(acc1);
    console.log("Account0 Balance: ", acc0Bal1.toNumber()); console.log("Account1 Balance: ", acc1Bal1.toNumber());
   
    let r = await coin.transfer(acc1, deposit, { from: acc0 })
    //console.log("logs:%s - first:%s", r.logs.length, r.logs[0].event); 
    let r2 = await coin.transfer(acc1, deposit, { from: acc0 })
    let r3 = await coin.transfer(acc0, deposit, { from: acc1 })

    let acc0Bal2 = await coin.balanceOf(acc0);
    let acc1Bal2 = await coin.balanceOf(acc1);
    console.log("Account0 New Balance: ", acc0Bal2.toNumber()); console.log("Account1 New Balance: ", acc1Bal2.toNumber());
    assert.equal(acc0Bal2.toNumber(), "7189", "correct acc0 balance")
    assert.equal(acc1Bal2.toNumber(), "998", "correct acc1 balance")

    let coinBal2 = await coin.balanceOf(coinAddress);
    console.log("Coin Balance End:", coinBal2.toNumber());
    assert.equal(coinBal2.toNumber(), "3", "correct coin balance")

  })
}

function sendAgain(){

  it("Acc0 sends more Ether for Fee Era, withdraws all", async () => {
    await delay(1100);
    let _acc = acc0;

    var i = 0
    do {
      await delay(timeDelay);
      let _era = (new BigNumber(await coin.currentEra.call())).toFixed()
      let _day = (new BigNumber(await coin.currentDay.call())).toFixed()
      let _emission = (new BigNumber(await coin.getDayEmission())).toFixed()
      console.log("Era: %s - Day: %s - Emission: %s", _era, _day, _emission)

      let receipt = await coin.send(sendEth, { from: _acc})
      let receipt2 = await coin.withdrawShare(_era, _day, { from: _acc })

      let coinBal1 = new BigNumber(await coin.balanceOf(coinAddress)).toFixed();
      console.log("Coin Balance End: ", coinBal1);
      let balance = await web3.eth.getBalance(coinAddress)
      //console.log("balance", balance);

      i++
    }
    while (i <= 8 ); 
  })
}

function checkTotals(){
    it("Check Totals", async () => {
    let fees = (new BigNumber(await coin.totalFees.call())).toFixed()
    assert(fees, totalFees, "fees correct")

    let Burnt = (new BigNumber(await coin.totalBurnt.call())).toFixed()
    assert(Burnt, totalBurnt, "Burn correct")
  })
}
