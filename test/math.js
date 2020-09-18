/*
################################################
Core CLP logic
No state
################################################
*/

var BigNumber = require('bignumber.js');

const one = new BigNumber(10**18);

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

  function calcStakeUnits(b, B, t, T) {
    // units = ((P (t B + T b))/(2 T B)) * slipAdjustment
    // P * (part1 + part2) / (part3) * slipAdjustment
    const _b = new BigNumber(b);
    const _t = new BigNumber(t);
    const _B = new BigNumber(B);
    const _T = new BigNumber(T);
    const slipAdjustment = getSlipAdustment(b, B, t, T);
    const part1 = t.times(B);
    const part2 = T.times(b);
    const part3 = T.times(B).times(2);
    const units = (P.times(part1.plus(part2))).div(part3);
    return units.times(slipAdjustment).div(one).integerValue(1);  // Divide by 10**18;
  }

function getSlipAdustment(b, B, t,  T){
    // slipAdjustment = (1 - ABS((B t - b T)/((2 b + B) (t + T))))
    // 1 - ABS(part1 - part2)/(part3 * part4))
    const _b = new BigNumber(b);
    const _t = new BigNumber(t);
    const _B = new BigNumber(B);
    const _T = new BigNumber(T);
    const part1 = _B.times(_t);
    const part2 = _b.times(_T);
    const part3 = _b.times(2).plus(_B);
    const part4 = _t.plus(_T);
    let numerator;
    if(part1 > part2){
        numerator = part1.minus(part2);
    } else {
        numerator = part2.minus(part1);
    }
    const denominator = part3.times(part4);
    return one.minus((numerator.times(one)).div(denominator)).integerValue(0); // Multiply by 10**18
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
calcStakeUnits: function(a, A, v, V, P) {
  return calcStakeUnits(a, A, v, V, P)
},
getSlipAdustment: function(a, A, v, V) {
  return getSlipAdustment(a, A, v, V)
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


  


