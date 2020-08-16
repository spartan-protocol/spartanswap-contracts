var Sparta = artifacts.require("./Sparta.sol")
const BigNumber = require('bignumber.js')

var coin; var coinAddress
var acc0; var acc1; var acc2;
var Era; var Day;

const Emission = '2048'; 
const send1 = 1000;

const timeDelay = 1000;
const delay = ms => new Promise(res => setTimeout(res, ms));
//######################################################################################
// This tests to ensure that users can pay and withdraw for other members
//######################################################################################

contract("Sparta", function(accounts) {
  constructor(accounts)
  sendEther(acc0)
  sendEther(acc0)
  withdraw(acc0)
  sendEtherForMember(acc1, acc2)
  sendEtherForMember(acc1, acc2)
  withdrawForMember(acc1, acc2, 512)
  sendEtherForMember(acc1, acc2)
  sendEtherForMember(acc1, acc2)
  withdrawForMember(acc0, acc2, 768)
})

function constructor(accounts) {
  acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2];
  it("constructor events", async () => {
    let Sparta = artifacts.require("Sparta.sol");
    coin = await Sparta.new()
    coinAddress = coin.address;
    //console.log("coin:", coinAddress) 
  });
}

function sendEther(_acc) {
  
  it("Acc0 sends Ether", async () => {
    await delay(timeDelay)
    Era = await coin.currentEra.call(); Day = await coin.currentDay.call()
    let _emission = Emission;
    
    let tx = await coin.send(send1, { from: _acc})
    // //console.log("blocknumber:", receipt.logs[0].blockNumber);
    //console.log(tx.logs[0].args.member, tx.logs[0].args.member, tx.logs[0].args.era, tx.logs[0].args.day, tx.logs[0].event); 
    //console.log('Tx: %s Sent from Acc: %s', tx.receipt.transactionHash, _acc)
    //console.log('Emission:%s Era%s Day%s', _emission, Era, Day)
  })
}

function withdraw(_acc) {
	it("Acc0 withdraws", async () => {
    await delay(timeDelay)
    //Era = await coin.currentEra.call(); Day = await coin.currentDay.call()
		let _era = Era; let _day = Day;
    let _bal = 2048

    let tx = await coin.withdrawShare(_era, _day, { from: _acc })
    //console.log('Tx: %s Sent from Acc: %s', tx.receipt.transactionHash, _acc)
   // //console.log('Era%s Day%s', _era, _day)

    let balBN = new BigNumber(await coin.balanceOf(_acc))
    assert.equal(balBN.toFixed(), _bal, "correct acc bal")

    let units = await coin.mapEraDay_MemberUnits.call(_era, _day, _acc);
    assert.equal(units, "0", "the units is correct");

    let totalUnits = await coin.mapEraDay_UnitsRemaining.call(_acc, _day);
    assert.equal(totalUnits, "0", "the total units is correct");

    let valueShare = await coin.getEmissionShare(_era, _day, _acc);
    assert.equal(valueShare, "0", "the value share is correct");

    let valueLeft = await coin.mapEraDay_EmissionRemaining.call(_era, _day);
    assert.equal(valueLeft, "0", "the value left is correct");

    let coinBal1 = await coin.balanceOf(coinAddress);
    //console.log("coinBal1", coinBal1.toNumber());


  })

}

function sendEtherForMember(_acc, _member) {
    it("Acc0 sends Ether with member", async () => {
      await delay(timeDelay)
      Era = await coin.currentEra.call(); Day = await coin.currentDay.call()
      let _emission = Emission
      let tx = await coin.burnEtherForMember(_member,  { from: _acc, value:send1 })
      //console.log(tx.receipt.transactionHash);
      //console.log("logs:%s - first:%s", tx.logs.length, tx.logs[0].event); 
      //console.log(tx.logs[0].args.member, tx.logs[0].args.member, tx.logs[0].args.era, tx.logs[0].args.day, tx.logs[0].event); 
      //console.log('Tx%s Sent from Acc:%s with member:%s', tx, _acc, _member)
      //console.log('Emission:%s Era%s Day%s', _emission, Era, Day)

    })
  }

function withdrawForMember(_acc, _member, _bal) {
	it("Acc0 withdraws", async () => {
    await delay(timeDelay)
    //Era = await coin.currentEra.call(); Day = await coin.currentDay.call()
		let _era = Era; let _day = Day;

    let tx = await coin.withdrawShareForMember(_era, _day, _member, { from: _acc })
    //console.log('Tx%s Sent from Acc:%s with member:%s', tx.transactionHash, _acc, _member)
    //console.log('Era%s Day%s', _era, _day)

    let balBN = new BigNumber(await coin.balanceOf(_member))
    assert.equal(balBN.toFixed(), _bal, "correct acc bal")

    let units = await coin.mapEraDay_MemberUnits.call(_era, _day, _member);
    assert.equal(units, "0", "the units is correct");

    let totalUnits = await coin.mapEraDay_UnitsRemaining.call(_member, _day);
    assert.equal(totalUnits, "0", "the total units is correct");

    let valueShare = await coin.getEmissionShare(_era, _day, _member);
    assert.equal(valueShare, "0", "the value share is correct");

    let valueLeft = await coin.mapEraDay_EmissionRemaining.call(_era, _day);
    //console.log(valueLeft)
    assert.equal(valueLeft, 0, "the value left is correct");

    let coinBal1 = await coin.balanceOf(coinAddress);
    //console.log("coinBal1", coinBal1.toNumber());

  })

}
