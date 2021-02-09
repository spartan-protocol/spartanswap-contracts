//iBEP20 Interface
pragma solidity 0.6.8;
interface iBEP20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function burnFrom(address, uint256) external;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");
        return c;
    }
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;
        return c;
    }
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        return c;
    }
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }
        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");
        return c;
    }
}
interface iBASE {
    function claim(address asset, uint256 amount) external payable;  
    function secondsPerEra() external view returns (uint256);
    function DAO() external view returns (iDAO);
    function burn(uint) external;
    function changeIncentiveAddress(address) external returns(bool);
    function changeDAO(address) external returns(bool);
    function changeEmissionCurve(uint256) external returns(bool);
    function changeEraDuration(uint256) external returns(bool);
    function listAsset(address, uint256, uint256) external returns(bool);
    function delistAsset(address) external returns(bool);
    function startEmissions() external returns(bool);
    function stopEmissions() external returns(bool);
    function transferTo(address, uint256) external payable returns(bool);
}
interface iROUTER {
    function totalPooled() external view returns (uint);
    function totalVolume() external view returns (uint);
    function totalFees() external view returns (uint);
    function isCuratedPool(address) external view returns (bool);
    function addCuratedPool(address) external view returns (bool);
    function removeCuratedPool(address) external view returns (bool);
    function removeLiquidityTx() external view returns (uint);
    function addLiquidityTx() external view returns (uint);
    function swapTx() external view returns (uint);
    function getCuratedPoolsLength() external view returns (uint);
    function tokenCount() external view returns(uint);
    function getCuratedPool(uint) external view returns(address);
    function getToken(uint) external view returns(address);
    function getPool(address) external view returns(address payable);
    function grantFunds(uint, address) external returns (bool);
    function addLiquidityForMember(uint inputBase, uint inputToken, address token, address member) external payable returns (uint units);
    function isPool(address) external view returns(bool);
    function swap(uint, address, address) external returns(uint, uint);
    function challengLowestCuratedPool(address) external view returns (bool); 
    function addLiquidity(uint inputBase, uint inputToken, address token) external payable returns (uint units);
    function changeArrayFeeSize(uint) external view returns(bool);
    function changeMaxTrades(uint) external view returns(bool);
    function addLiquidityAsym(uint, bool, address) external returns(uint);
    function removeLiquidityAsym(uint, bool, address) external returns(uint);
    function removeLiquidityExact(uint, address) external returns(uint, uint);
    function swapSynthToBase(uint inputAmount, address synthIN) external returns (uint outPut);
    function swapBaseToSynth(uint inputAmount, address synthOUT) external returns (uint outPut);
}
interface iWBNB {
    function withdraw(uint256) external;
}
interface iUTILS {
    function calcPart(uint bp, uint total) external pure returns (uint part);
    function calcShare(uint part, uint total, uint amount) external pure returns (uint share);
    function calcLiquidityShare(uint units, address token, address pool) external pure returns (uint share);
    function calcSwapOutput(uint x, uint X, uint Y) external pure returns (uint output);
    function calcSwapFee(uint x, uint X, uint Y) external pure returns (uint output);
    function calcLiquidityUnits(uint b, uint B, uint t, uint T, uint P) external pure returns (uint units);
    function getPoolShareWeight(address token, uint units)external view returns(uint weight);
    function getPoolShare(address token, uint units) external view returns(uint baseAmount, uint tokenAmount);
    function getPoolShareAssym(address token, uint units, bool toBase) external view returns(uint baseAmount, uint tokenAmount, uint outputAmt);
    function calcSpotValueInBase(address token, uint amount) external view returns (uint value);
    function calcSpotValueInToken(address token, uint amount) external view returns (uint value);
    function calcSpotValueInBaseWithPool(address pool, uint amount) external view returns (uint value);
    function calcSwapValueInBase(address pool, uint256 amount) external view returns (uint256 value);
    function calcSwapValueInBaseWithPool(address pool, uint amount) external view returns (uint value);
    function getPool(address token)external view returns (address value);
    function getDepth(address pool) external view returns (uint depth);
    function calcAsymmetricValue(address token, uint units) external view returns(uint amount);
    function calcSwapValueInTokenWithPool(address pool, uint amount) external view returns (uint _output);
    function calcDebtShare(uint units, uint amount, address, address synth) external view returns (uint unitSynths);
    function calcSwapValueInToken(address token, uint units) external view returns (uint amount);
    function calcBasisPoints(uint, address, address) external view returns(uint amount);
    function calcSynthsValue(address, uint) external view returns(uint units);
    function calcCDPValue(address) external view returns (uint);
    function allCuratedPools() external view returns (address [] memory);
    function getShareOfTokenAmount(address, address) external view returns(uint);
}

interface iDAO {
    function ROUTER() external view returns(address);
    function UTILS() external view returns(address);
    function SYNTHROUTER() external view returns(address);
    function BOND() external view returns(address);
    function DAO() external view returns (address);
    function depositForMember(address pool, uint256 amount, address member) external;
    function deposit(address pool, uint256 amount) external;
    function mapMember_weight(address member) external returns (uint256);
    function totalWeight() external returns (uint256);
}
interface iPOOL {
    function TOKEN() external view returns(address);
    function transferTo(address, uint) external returns (bool);
    function genesis() external view returns(uint);
    function baseAmount() external view returns(uint);
    function tokenAmount() external view returns(uint);
    function fees() external view returns(uint);
    function sync() external;
    function volume() external view returns(uint);
    function txCount() external view returns(uint);
    function getBaseAmtPooled(address) external view returns(uint);
    function getTokenAmtPooled(address) external view returns(uint);
}
interface iBOND {
function mintBond() external returns (bool);
function burnBond() external returns (bool);
function calcClaimBondedLP(address member, address asset) external returns (uint256);
function claimAndLock(address asset) external returns (bool);
function listBondAsset(address) external view returns (bool);
function delistBondAsset(address) external view returns (bool);
function changeBondingPeriod(uint) external view returns (bool);
}
interface iSYNTHROUTER {
    function getSynth(address) external view returns(address);
    function isSynth(address) external view returns(bool);
}
interface iSYNTH {
    function LayerONE() external view returns(address);
    function transferTo(address, uint) external returns (bool);
    function genesis() external view returns(uint);
    function totalMinted() external view returns(uint);
    function _liquidate(address) external;
    function changeLiqFactor(uint) external;
    function burnFrom(address, uint) external;
    function swapIN(uint, address, address) external returns (uint);
    function swapOUT(uint) external returns(uint);
    function getMemberLength() external view returns (uint);
    function getMemberDetails(address, address) external view returns (uint);
    function members() external view returns (address [] memory);
}
interface iDAOVAULT {
    function withdraw(address, uint) external  returns (bool);
}


