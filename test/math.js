/*
################################################
Core CLP logic
No state
################################################
*/

var BigNumber = require('bignumber.js');

function calcSwapOutput(x, X, Y) {
    // y = (x * Y * X)/(x + X)^2
    const _x = new BigNumber(x)
    const _X = new BigNumber(X)
    const _Y = new BigNumber(Y)
    const numerator = _x.times(_Y).times(_X)
    const denominator = (_x.plus(_X)).times(_x.plus(_X))
    const _y = numerator.div(denominator)
    const y = (new BigNumber(_y)).integerValue(1);
    return y;
  }
  
   function calcSwapFee(x, X, Y) {
    // y = (x * Y * x) / (x + X)^2
    const _x = new BigNumber(x)
    const _X = new BigNumber(X)
    const _Y = new BigNumber(Y)
    const numerator = _x.times(_Y.times(_x));
    const denominator = (_x.plus(_X)).times(_x.plus(_X));
    const _y = numerator.div(denominator);
    const y = (new BigNumber(_y)).integerValue(1);
    return y;
  }
  
   function calcLiquidation(x, X, Y) {
    // y = (x * Y * (X - x))/(x + X)^2
    const _x = new BigNumber(x)
    const _X = new BigNumber(X)
    const _Y = new BigNumber(Y)
    const numerator = _x.times(_Y.times(_X.minus(_x)));
    const denominator = (_x.plus(_X)).times(_x.plus(_X));
    const _y = numerator.div(denominator);
    const y = (new BigNumber(_y)).integerValue(1);
    return y;
  }
  function calcStakeUnits(a, A, v, V) {
     // ((V + A) * (v * A + V * a))/(4 * V * A)
    const _v = new BigNumber(v);
    const _a = new BigNumber(a);
    const _V = new BigNumber(V);
    const _A = new BigNumber(A);
    const numerator1 = _V.plus(_A);
    const numerator2 = _v.times(_A);
    const numerator3 = _V.times(_a);
    const numerator = numerator1.times((numerator2.plus(numerator3)));
    const denominator = (_V.times(_A)).times(4);
    const _units = numerator.div(denominator);
    const poolUnits = (_units).integerValue(1);
    return poolUnits;
  }

  function calcAsymmetricShare(s, T, A) {
    // share = (s * A * (2 * T^2 - 2 * T * s + s^2))/T^3
    // (part1 * (part2 - part3 + part4)) / part5
    const part1 = s.times(A);
    const part2 = T.times(T).times(2);
    const part3 = T.times(s).times(2);
    const part4 = s.times(s);
    const numerator = part1.times(part2.minus(part3).plus(part4));
    const part5 = T.times(T).times(T);
    return (numerator.div(part5)).integerValue(1);
}

function calcShare(s, T, A, V){
  const share = s.div(T)
  const a = A.mul(share)
  const v = V.mul(share)
  return ({'token':a, 'spartan':v})
}

function calcValueIn(a, A, V) {
  const _a = new BigNumber(a)
  const _A = new BigNumber(A)
  const _V = new BigNumber(V)
  const numerator = _a.times(_V)
  const _v = numerator.div(_A)
  return (new BigNumber(_v)).integerValue(1);;
}

module.exports = {
  calcSwapOutput: function(x, X, Y) {
  return calcSwapOutput(x, X, Y)
},
calcSwapFee: function(x, X, Y) {
  return calcSwapFee(x, X, Y)
},
calcLiquidation: function(x, X, Y) {
  return calcLiquidation(x, X, Y)
},
calcStakeUnits: function(a, A, v, V) {
  return calcStakeUnits(a, A, v, V)
},
calcAsymmetricShare: function(s, T, A) {
  return calcAsymmetricShare(s, T, A)
},
calcShare: function(s, T, A, V) {
  return calcShare(s, T, A, V)
},
calcValueIn: function(a, A, V) {
  return calcValueIn(a, A, V)
}
};


  


