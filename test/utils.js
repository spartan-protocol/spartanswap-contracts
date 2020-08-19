/*
################################################
Utility functions
Such as Bignumbers
################################################
*/

var BigNumber = require('bignumber.js');

const delay = ms => new Promise(res => setTimeout(res, ms));


const one = 1 * 10 ** 18;
const oneBN = new BigNumber(1 * 10 ** 18)
const dot1BN = new BigNumber(1 * 10 ** 17)
const dot01BN = new BigNumber(1 * 10 ** 16)
const ETH = "0x0000000000000000000000000000000000000000"

function getBN(BN) { return (new BigNumber(BN))}

function BN2Int(BN) { return +(new BigNumber(BN)).toFixed() }

function BN2Str(BN) { return (new BigNumber(BN)).toFixed() }

function BN2Token(BN) { return ((new BigNumber(BN)).dividedBy(one)).toFixed(2) }

function int2BN(int) { return (new BigNumber(int)) }

function int2Str(int) { return ((int).toString()) }

function int2Num(int) { return (int / (one)) }

function floorBN(BN){
  return (new BigNumber(BN)).integerValue(1)
}
function ceilBN(BN){
  return ((new BigNumber(BN)).integerValue(1)).plus(1)
}

function assertLog(thing1, thing2, test) {
  return console.log(thing1, thing2, test)
}
function logType(thing) {
  return console.log("%s type", thing, typeof thing)
}

module.exports = {
  BN2Int: BN2Int
  ,
  BN2Str: BN2Str, BN2Token,
  getBN,
  int2BN: int2BN
  ,
  int2Str: int2Str
  ,
  int2Num: int2Num
  ,
  floorBN, ceilBN
  ,
  assertLog
  ,
  logType
  ,
  ETH: ETH,
  one:one,
  oneBN:oneBN, dot1BN:dot1BN, dot01BN:dot01BN

};
















