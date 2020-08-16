var Sparta = artifacts.require("./Sparta.sol")
const BigNumber = require('bignumber.js')
var TruffleAssert = require('truffle-assertions')

var coin; var coinAddress;
var acc0; var acc1; var acc2; var BurnAddress  

const Emission = '2048'; const Supply = "8190"; 
const DaysPerEra = '2'; const SecondsPerDay = 1;              
const Era = 1; const Day = 1 

//######################################################################################
// This test initialises Sparta
// Then tests to make sure fails an unauthorised tx
// Then tests Sparta params
//######################################################################################

contract("Sparta", function(accounts) {
  constructor(accounts)
  initialises()
  failTx()
  checkParams()
})

function constructor(accounts){
  acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; BurnAddress = acc2

  it("constructor events", async () => {
    let Sparta = artifacts.require("Sparta.sol");
    coin = await Sparta.new()
    coinAddress = coin.address;
    console.log("coin:", coinAddress)

    const transactionHash = coin.transactionHash;
    const transactionReceipt = web3.eth.getTransactionReceipt(transactionHash);
    const blockNumber = transactionReceipt.blockNumber;
    const eventList = await coin.getPastEvents("allEvents", {fromBlock: blockNumber, toBlock: blockNumber});
    const logs = eventList.filter(ev => ev.transactionHash === transactionHash)
    assert.equal(logs[0].returnValues.value, Supply, 'correct mint')

  });
}

function initialises(){

  it("initializes with correct number, name, symbol", async () => {
    
    let countBN = new BigNumber(await coin.totalSupply())
    assert(countBN.isEqualTo(new BigNumber(Supply)), "correct number")

    let name = await coin.name()
    assert.equal(name, "Sparta", "correct name")

    let sym = await coin.symbol()
    assert.equal(sym, "SPARTA", "correct symbol")

    let decimals = await  coin.decimals()
    assert.equal(decimals, 18, "correct decimals")

  })

    it("initializes with correct balances", async () => {
    let bal = await coin.balanceOf(coinAddress)
    assert.equal(bal, Supply, "correct coin bal")
    let bal1 = await coin.balanceOf(acc0)
    assert.equal(bal1, 0, "correct acc0 bal")
    let bal2 = await coin.balanceOf(acc1)
    assert.equal(bal2, 0, "correct acc1 bal")
    let bal3 = await coin.balanceOf(acc2)
    assert.equal(bal3, 0, "correct acc2 bal")
  })

  it("initializes with correct allowances", async () => {
    let all1 = await coin.allowance(acc0, acc1)
    assert.equal(all1, 0, "correct acc1 allowance")
   let all2 = await coin.allowance(acc0, acc2)
    assert.equal(all2, 0, "correct acc1 allowance")
  })
}

function failTx(){
  it("throws an exception for someone tries to make tx", async () => {
    let tx1 = await TruffleAssert.reverts(coin.transfer(acc2, '1', { from: acc0 }))
    let bal0 = await coin.balanceOf(coinAddress);
    assert.equal(bal0, Supply, "correct coin bal");
  });
}

function checkParams(){
  // Params
  it("initializes with correct params", async () => {
    let _emission = new BigNumber(await coin.emission.call())
      assert.equal(_emission.toFixed(), Emission, "correct emission");
      let _era = new BigNumber(await coin.currentEra.call())
      assert.equal(_era.toNumber(), Era, "correct era");
      let _day = new BigNumber(await coin.currentDay.call())
      assert.equal(_day.toFixed(), Day, "correct day");
      let daysPerEra = new BigNumber(await coin.daysPerEra.call())
      assert.equal(daysPerEra.toFixed(), DaysPerEra, "correct days per era");
      let secondsPerDay = new BigNumber(await coin.secondsPerDay.call())
      assert.equal(secondsPerDay.toFixed(), SecondsPerDay, "SecondsPerDay");

      let genesis = new BigNumber(await coin.genesis.call())
      let nextEraTime = new BigNumber(await coin.nextEraTime.call())
      let nextDayTime = new BigNumber(await coin.nextDayTime.call())
      assert.equal(genesis.plus(secondsPerDay).toFixed(), nextDayTime.toFixed(), 'day time correct')
      assert.equal(genesis.plus((daysPerEra.multipliedBy(secondsPerDay))).toFixed(), nextEraTime.toFixed(), 'era time correct')

      let _burnAddress = await coin.burnAddress.call()
      assert.equal(_burnAddress, BurnAddress, "correct BurnAddress")
      let _mapEra_Emission = new BigNumber(await coin.mapEra_Emission.call(Era))
      assert.equal(_mapEra_Emission.toFixed(), Emission, "correct emission");

      let memberUnits = await coin.mapEraDay_MemberUnits.call(Era, Day, acc0);
      assert.equal(memberUnits, "0", "correct member units");
      let totalUnits = await coin.mapEraDay_Units.call(Era, Day);
      assert.equal(totalUnits, "0", "correct totalUnits");

      let bal = await coin.balanceOf(coinAddress);
      assert.equal(bal, Supply, "bal");
      let rewardLeft = await coin.mapEraDay_Emission.call(Era, Day);
      assert.equal(rewardLeft, Emission, "correct rewardleft for Era 1, Day 1");
    
 })

}
