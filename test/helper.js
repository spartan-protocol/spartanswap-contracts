/*
################################################
Stake based help functions to test
Useful for tests that require state
################################################
*/

var BigNumber = require('bignumber.js');
const _ = require('./utils')
const math = require('./math.js');

const usdPool = { "token": (2 * _.one).toString(), "mai": (2 * _.one).toString() };

async function calcValueInVeth(instance, token) {
  var result;
  var tokenBal; var maiBal; 
  if (token == _.addressETH) {
    tokenBal = new BigNumber((await instance.mapToken_ExchangeData(token)).token);
    maiBal = new BigNumber((await instance.mapToken_ExchangeData(token)).sparta);
    result = (_.oneBN.times(maiBal)).div(tokenBal)
  } else {
    tokenBal = new BigNumber((await instance.mapToken_ExchangeData(token)).token);
    maiBal = new BigNumber((await instance.mapToken_ExchangeData(token)).sparta);
    result = (_.oneBN.times(maiBal)).div(tokenBal)
  }
  return result.toFixed()
}

async function calcValueInToken() {
  var usdBal = new BigNumber(usdPool.token)
  var maiBal = new BigNumber(usdPool.mai)
  return ((_.oneBN.times(usdBal)).div(maiBal)).toFixed()
}
async function calcEtherPriceInUSD(instance, amount) {
  const _amount = new BigNumber(amount)
  const etherPriceInVeth = new BigNumber(await calcValueInVeth(instance, _.addressETH))
  const maiPriceInUSD = new BigNumber(await calcValueInToken())
  const ethPriceInUSD = (maiPriceInUSD.times(etherPriceInVeth)).div(_.oneBN)
  return ((_amount.times(ethPriceInUSD)).div(_.oneBN)).toFixed()
}
async function calcEtherPPinSPARTA(instance, amount) {
  var tokenBal = new BigNumber((await instance.mapToken_ExchangeData(_.addressETH)).token);
  var maiBal = new BigNumber((await instance.mapToken_ExchangeData(_.addressETH)).sparta);
  const outputVeth = math.calcCLPSwap(amount, tokenBal, maiBal);
  return outputVeth;
}
async function calcSPARTAPPInUSD(amount) {
  var usdBal = new BigNumber(usdPool.token)
  var maiBal = new BigNumber(usdPool.mai)
  const outputUSD = math.calcCLPSwap(amount.toString(), maiBal, usdBal);
  return outputUSD;
}
async function checkLiquidateCDP(instance, _collateral, _debt) {
  var tokenBal = new BigNumber((await instance.mapToken_ExchangeData(_.addressETH)).token);
  var maiBal = new BigNumber((await instance.mapToken_ExchangeData(_.addressETH)).sparta);
  const outputVeth = math.calcCLPLiquidation(_collateral, tokenBal, maiBal);
  var canLiquidate
  if (outputVeth < _debt) {
    canLiquidate = true;
  } else {
    canLiquidate = false;
  }
  return canLiquidate;
}
async function logPool(instance, addressToken, ticker) {
  const token = _.BN2Token((await instance.poolData()).token);
  const sparta = _.BN2Token((await instance.poolData()).sparta);
  const tokenStaked = _.BN2Token((await instance.poolData()).tokenStaked);
  const spartaStaked = _.BN2Token((await instance.poolData()).spartaStaked);
  const poolUnits = _.BN2Token((await instance.totalSupply()));
  const fees = _.BN2Token((await instance.poolData()).fees);
  const volume = _.BN2Token((await instance.poolData()).volume);
  const txCount = _.getBN((await instance.poolData()).txCount);
  console.log("\n-------------------Token-Sparta Details -------------------")
  console.log(`ADDRESS: ${addressToken}`)
  console.log(`MAPPINGS: [ ${token} ${ticker} | ${sparta} SPARTA ]`)
  console.log(`STAKES: [ ${tokenStaked}  ${ticker} | ${spartaStaked} SPARTA ]`)
  console.log(`UNITS: [ ${poolUnits} units ]`)
  console.log(`AVE: [ ${fees} fees, ${volume} volume, ${txCount} txCount ]`)
  console.log("-----------------------------------------------------------\n")
}
async function logStaker(instance, acc, pool) {
  let stakeData = (await instance.getMemberData(acc))
  console.log("\n-------------------Staker Details -------------------")
  console.log(`ADDRESS: ${acc} | POOL: ${pool}`)
  console.log(`StakeData: [ ${_.BN2Token(stakeData.sparta)} SPARTA | ${_.BN2Token(stakeData.token)} ETH ]`)
  console.log("-----------------------------------------------------------\n")
}
async function logETHBalances(acc0, acc1, ETH) {
  const acc0TokenBal = await web3.eth.getBalance(acc0)
  const acc1TokenBal = await web3.eth.getBalance(acc1)
  const addressETHBalance = await web3.eth.getBalance(ETH)
  console.log(" ")
  console.log("----------------------ETH BALANCES---------------------")
  console.log('acc0:       ', acc0TokenBal / (_.one))
  console.log('acc1:       ', acc1TokenBal / (_.one))
  console.log('_.addressETH: ', _.addressETHBalance / (_.one))
}
async function logSPARTABalances(instance, acc0, acc1, SPARTAAddress) {
  // instance = await SPARTA.deployed();
  const acc0SPARTABalance = _.BN2Int(await instance.balanceOf(acc0))
  const acc1SPARTABalance = _.BN2Int(await instance.balanceOf(acc1))
  const addressSPARTABalance = _.BN2Int(await instance.balanceOf(SPARTAAddress))
  console.log(" ")
  console.log("-----------------------SPARTA BALANCES--------------------")
  console.log('acc0:       ', acc0SPARTABalance / (_.one))
  console.log('acc1:       ', acc1SPARTABalance / (_.one))
  console.log('addressSPARTA: ', addressSPARTABalance / (_.one))

}

async function logCDP(instance, CDPAddress) {
  // instance = await SPARTA.deployed();
  const CDP = new BigNumber(await instance.mapAddress_MemberData.call(CDPAddress)).toFixed();
  const Collateral = new BigNumber((await instance.mapCDP_Data.call(CDP)).collateral).toFixed();
  const Debt = new BigNumber((await instance.mapCDP_Data.call(CDP)).debt).toFixed();
  console.log(" ")
  console.log("-----------------------CDP DETAILS----------------------")
  console.log('CDP:        ', CDP)
  console.log('Collateral: ', Collateral / (_.one))
  console.log('Debt:       ', Debt / (_.one))

}

module.exports = {
  logCDP: logCDP
  ,
  logSPARTABalances: logSPARTABalances
  ,
  logETHBalances: logETHBalances
  ,
  logPool: logPool
  ,
  logStaker: logStaker
  ,
  checkLiquidateCDP: checkLiquidateCDP
  ,
  calcSPARTAPPInUSD: calcSPARTAPPInUSD
  ,
  calcEtherPPinSPARTA: calcEtherPPinSPARTA
  ,
  calcEtherPriceInUSD: calcEtherPriceInUSD
  ,
  calcValueInToken: calcValueInToken
  ,
  calcValueInVeth: calcValueInVeth
  ,


}

