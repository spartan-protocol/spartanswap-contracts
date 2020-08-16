const BigNumber = require('bignumber.js')
//const assert = require('assert')
var Sparta = artifacts.require("./Sparta.sol")
var Token1 = artifacts.require("./Token1.sol") 
var Token2 = artifacts.require("./Token2.sol") 

var Registry1 = artifacts.require("./Registry1.sol")

var Exchange1 = artifacts.require("./Exchange1.sol")


var coin; var coinAddress; 
var acc0; var acc1; var acc2; var accBurn;
var TknContractArray = [Token1, Token2];
var TknInstArray = []; var TknAddrArray = [];
var RegContract = Registry1; var RegInst; var RegAddr;
var ExcContract = Exchange1; var ExcInst; var ExcAddr;
var event = {"era":"", "day":"", "emission":""}

const timeDelay = 1100;
const delay = ms => new Promise(res => setTimeout(res, ms));
function BN2Int(BN) {return ((new BigNumber(BN)).toFixed()) }

//######################################################################################
// This test deploys Sparta, two different ERC-20 tokens, 
// 1 with UniSwap registry and exchange. 
// It then registers the token in the exchange, and the exchange in the registry. 
// It places ether in the exchange to provide a pool balance
// It then sends the first token, which has a market and then withdraws
// It then sends the third token which is not found in the registry and withdraws
// It then repeats, but designating a payment member
//######################################################################################

contract("Sparta", async accounts => {
	constructor(accounts)
	deployTokens()
	deployRegistries()
	deployExchanges()
	setRegExc()
	sendToken(0, acc0)
	withdraws(acc0, event, 2048)
	sendToken(1, acc0)
	withdraws(acc0, event, 3072)
	sendToken(0, acc0, acc1)
	withdraws(acc0, event, 3584, acc1)
	sendToken(1, acc0, acc1)
	withdraws(acc0, event, 3584, acc1)
})

function constructor(accounts) {
	acc0 = accounts[0]; acc1 = accounts[1]; acc2 = accounts[2]; accBurn = acc2;
	//console.log(acc2)
	it("initializes with correct params", async () => {
		coin = await Sparta.new()
		coinAddress = coin.address; //console.log("coinAddress:", coinAddress)
	})
}

function deployTokens(){
	it("Deploy and get Token Addresses", async () => {
		for(var i = 0; i < TknContractArray.length; i++) {
			TknInstArray[i] = await TknContractArray[i].new(); TknAddrArray[i] = TknInstArray[i].address; //console.log("tkn%sAddr:%s", i, TknAddrArray[i])
		}
	})
}

function deployRegistries(){
	it("Deploy and get Registry Addresses", async () => {
		RegInst = await RegContract.new(); 
		RegAddr = RegInst.address; //console.log("Reg%sAddr:%s", i, RegAddr)
	})
}

function deployExchanges(){
	it("Deploy and get Exchange Addresses", async () => {
		ExcInst = await ExcContract.new(); ExcAddr = ExcInst.address; //console.log("Exc%sAddr:%s", i, ExcAddr)
	})
}

function setRegExc(){
	it("Set Exchange, Token addr", async () => {
			let r1 = await RegInst.setExchange(ExcAddr, TknAddrArray[0],  { from: acc0 })
			let r2 = await RegInst.getExchange(TknAddrArray[0],  { from: acc0 })
			assert.equal(r2, ExcAddr, "correct exchange addr set in registry")
			//console.log("excAddr set:", r2)

			let r3 = await coin.addRegistryInternal(RegAddr, { from: acc0 })
			let r4 = await coin.registryAddress.call()
			assert.equal(r4, RegAddr, "correct registry addr set in coin contract")
			//console.log("regAddr Set:", r4)

			let r5 = await coin.getExchange(TknAddrArray[0],  { from: acc0 })
			assert.equal(r5, ExcAddr, "correct exchange2 addr returned from coin")
			//console.log("excAddr Returned by Coin:", r5)

			let r6 = await ExcInst.setToken(TknAddrArray[0],  { from: acc0 })
			let r7 = await ExcInst.getToken()
			assert.equal(r7, TknAddrArray[0], "correct token addr set in exchange")
			//console.log("tknAddr Returned by Exc:", r7)

			let r8 = await ExcInst.send(8000000000000000, { from: acc2 })
			let balance = await web3.eth.getBalance(ExcAddr)
			assert.equal(balance, 8000000000000000, "exchange balance correct")
	})
}

function sendToken(i, _acc, member){
	it("Acc0 send Burn Tokens", async () => {
		await delay(timeDelay);

		let _era = await coin.currentEra.call()
		let _day = await coin.currentDay.call()
		let _emission = BN2Int(await coin.emission.call())
		event = {"era":_era, "day":_day, "emission":_emission} 

		let balEx1 = await TknInstArray[i].balanceOf(ExcAddr)
		let balBurn1 = await TknInstArray[i].balanceOf(accBurn)
		let accBurnBal1 = new BigNumber(await web3.eth.getBalance(accBurn));
		//console.log('accBurnBal1',accBurnBal1)

		let r1 = await TknInstArray[i].approve(coinAddress, "1000000000000000000", { from: _acc })
		var rx; var _member;
		if(!member){
			_member = _acc
			rx = await coin.burnTokens(TknAddrArray[i], "1000000000000000000",  { from: _acc })
		} else {
			_member = member
			rx = await coin.burnTokensForMember(TknAddrArray[i], "1000000000000000000", _member, { from: _acc })
		}

		//console.log("Era:%s - Day:%s - Token%s", _era.toNumber(), _day.toNumber(), i)
		//console.log("logs:%s - first:%s", rx.logs.length, rx.logs[4].event); 
		//console.log(rx.logs[2])

		if (i <= 0){
			let balEx2 = await TknInstArray[i].balanceOf(ExcAddr)
			//console.log('balEx2',BN2Int(balEx2))
			assert.equal(balEx2-balEx1, "1000000000000000000", "Exchange received Tokens");

			let accBurnBal2 = new BigNumber(await web3.eth.getBalance(accBurn));
			//console.log('accBurnBal2',accBurnBal2)
			assert.equal(BN2Int(accBurnBal2.minus(accBurnBal1)), "2000000000000000", "Burn Address received Ether");
	
			let memberUnits = new BigNumber(await coin.mapEraDay_MemberUnits.call(_era, _day, _member));
			assert.equal(memberUnits.toFixed(), '2000000000000000', "correct member units");
	
			let totalUnits = new BigNumber(await coin.mapEraDay_Units.call(_era, _day));
			assert.equal(totalUnits.toFixed(), "2000000000000000", "correct totalUnits");
		} else {
			let balBurn2 = await TknInstArray[i].balanceOf(accBurn);
			//console.log(balBurn2)
			assert.equal(balBurn2-balBurn1, "1000000000000000000", "BurnAddr received Tokens");
	
			let memberUnits = new BigNumber(await coin.mapEraDay_MemberUnits.call(_era, _day, _member));
			//console.log('memberUnits:', memberUnits.toFixed())
			assert.isAtLeast(+memberUnits.toFixed(), 616208000000000, "correct member units");
	
			let totalUnits = new BigNumber(await coin.mapEraDay_Units.call(_era, _day));
			//console.log('totalUnits:', totalUnits.toFixed())
			assert.isAtLeast(+totalUnits.toFixed(), 616208000000000, "correct totalUnits");
		}

		let emissionLeft = new BigNumber(await coin.mapEraDay_Emission.call(_era, _day));
		assert.equal(emissionLeft.toFixed(), _emission, "correct emissionleft");

		let memberUnits = BN2Int(await coin.mapEraDay_MemberUnits.call(_era, _day, _member))
		//console.log('memberUnits', memberUnits) 
		let totalUnits = BN2Int(await coin.mapEraDay_UnitsRemaining.call(_era, _day))
		//console.log('totalUnits', totalUnits)
		let emissionForDay = BN2Int(await coin.mapEraDay_Emission.call(_era, _day))
		//console.log('emissionForDay', emissionForDay)
		let balance = BN2Int(await coin.balanceOf.call(coinAddress))
		//console.log('balance', balance)
		let emissionRemaining = BN2Int(await coin.mapEraDay_EmissionRemaining.call(_era, _day))
		//console.log('emissionRemaining', emissionRemaining)
		if (emissionForDay > balance) { emissionForDay = balance; }
		//console.log('emissionForDay', emissionForDay)
		let emissionShare = (emissionForDay * memberUnits) / totalUnits;
		//console.log('emissionShare', emissionShare)
		if (emissionShare > emissionRemaining) {
			emissionShare = emissionRemaining;
			}
		//console.log('emissionShare', emissionShare)

		let _emissionShare = BN2Int(await coin.getEmissionShare(_era, _day, _member));
		//console.log(_era, _day, _member, _emissionShare)
		assert.equal(_emissionShare, _emission, "correct emissionShare");

	})
}

function withdraws(_acc, _event, _bal, member){

	it("Acc0 withdraws", async () => {

		let _era = event.era; let _day = event.day
		let _emission = event.emission
		
			var receipt; var _member;
			if (!member){
				_member = _acc
				receipt = await coin.withdrawShare(_era, _day, { from: _acc })
			} else {
				_member = member
				receipt = await coin.withdrawShareForMember(_era, _day, _member, { from: _acc })
			}
			//console.log('Era:%s - Day:%s', _era, _day)
			//console.log("logs:%s - first:%s", receipt.logs.length, receipt.logs[0].event); 
	
			let balBN = BN2Int(await coin.balanceOf(_member))
			//console.log('balBN',balBN)
			//assert.equal(balBN, _bal, "correct acc bal")
	
			let units = await coin.mapEraDay_MemberUnits.call(_era, _day, _member);
			assert.equal(units, "0", "the units is correct");

			let totalUnits = (new BigNumber(await coin.mapEraDay_UnitsRemaining.call(_era, _day))).toFixed();
			assert.equal(totalUnits, 0, "the total units is correct");
	
			let valueShare = await coin.getEmissionShare(_era, _day, _member);
			assert.equal(valueShare, "0", "the value share is correct");
	
			let valueLeft = BN2Int(await coin.mapEraDay_Emission.call(_era, _day))
			assert.equal(valueLeft, _emission, "the value left is correct");
	
			//let coinBal1 = await coin.balanceOf(coinAddress);
			////console.log("coinBal1", coinBal1.toNumber());

		// let balBN2 = new BigNumber(await coin.balanceOf(_acc))
		// assert.equal(balBN2.toFixed(), _emission*_era, "correct acc2 bal")
		// //console.log('Final Balance: ', balBN.toFixed())
   })
}