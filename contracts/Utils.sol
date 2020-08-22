// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

interface iERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint);
    function totalSupply() external view returns (uint);
    function balanceOf(address account) external view returns (uint);
}

interface iSPARTA {
    function mapAddressHasClaimed() external view returns (bool);
}

interface iSROUTER {
    function totalStaked() external view returns (uint);
    function totalVolume() external view returns (uint);
    function totalFees() external view returns (uint);
    function unstakeTx() external view returns (uint);
    function stakeTx() external view returns (uint);
    function swapTx() external view returns (uint);
    function tokenCount() external view returns(uint);
    function getToken(uint) external view returns(address);
    function getPool(address) external view returns(address payable);
    function stakeForMember(uint inputBase, uint inputToken, address token, address member) external payable returns (uint units);
}

interface iSPOOL {
    function genesis() external view returns(uint);
    function baseAmt() external view returns(uint);
    function tokenAmt() external view returns(uint);
    function baseAmtStaked() external view returns(uint);
    function tokenAmtStaked() external view returns(uint);
    function fees() external view returns(uint);
    function volume() external view returns(uint);
    function txCount() external view returns(uint);
    function getBaseAmtStaked(address) external view returns(uint);
    function getTokenAmtStaked(address) external view returns(uint);
    function calcValueInBase(uint) external view returns (uint);
    function calcValueInToken(uint) external view returns (uint);
    function calcTokenPPinBase(uint) external view returns (uint);
    function calcBasePPinToken(uint) external view returns (uint);
}

// SafeMath
library SafeMath {

    function add(uint a, uint b) internal pure returns (uint)   {
        uint c = a + b;
        assert(c >= a);
        return c;
    }

    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) {
            return 0;
        }
        uint c = a * b;
        require(c / a == b, "SafeMath");
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath");
    }
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;
        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath");
    }
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        return c;
    }
}

contract Utils {

    using SafeMath for uint;

    address public ROUTER;
    address public DEPLOYER;

    struct TokenDetails {
        string name;
        string symbol;
        uint decimals;
        uint totalSupply;
        uint balance;
        address tokenAddress;
    }

    struct ListedAssetDetails {
        string name;
        string symbol;
        uint decimals;
        uint totalSupply;
        uint balance;
        address tokenAddress;
        bool hasClaimed;
    }

    struct GlobalDetails {
        uint totalStaked;
        uint totalVolume;
        uint totalFees;
        uint unstakeTx;
        uint stakeTx;
        uint swapTx;
    }

    struct PoolDataStruct {
        address tokenAddress;
        address poolAddress;
        uint genesis;
        uint baseAmt;
        uint tokenAmt;
        uint baseAmtStaked;
        uint tokenAmtStaked;
        uint fees;
        uint volume;
        uint txCount;
        uint poolUnits;
    }
    struct MemberDataStruct {
        uint baseAmtStaked;
        uint tokenAmtStaked;
        uint stakerUnits;
    }
    // Only Deployer can execute
    modifier onlyDeployer() {
        require(msg.sender == DEPLOYER, "AdminErr");
        _;
    }

    constructor () public payable {
        DEPLOYER = msg.sender;
    }

    function setRouter(address router) public onlyDeployer {
        ROUTER = router;
    }

    function getTokenDetails(address token) public view returns (TokenDetails memory tokenDetails){
        if(token == address(0)){
            tokenDetails.name = 'Binance Chain Token';
            tokenDetails.symbol = 'BNB';
            tokenDetails.decimals = 18;
            tokenDetails.totalSupply = 100000000 * 10**18;
        } else {
            tokenDetails.name = iERC20(token).name();
            tokenDetails.symbol = iERC20(token).symbol();
            tokenDetails.decimals = iERC20(token).decimals();
            tokenDetails.totalSupply = iERC20(token).totalSupply();
        }
        tokenDetails.tokenAddress = token;
        return tokenDetails;
    }

    function getTokenDetailsWithBalance(address token, address member) public view returns (TokenDetails memory tokenDetails){
        tokenDetails.name = iERC20(token).name();
        tokenDetails.symbol = iERC20(token).symbol();
        tokenDetails.decimals = iERC20(token).decimals();
        tokenDetails.totalSupply = iERC20(token).totalSupply();
        tokenDetails.balance = iERC20(token).balanceOf(member);
        tokenDetails.tokenAddress = token;
        return tokenDetails;
    }

    function getUnclaimedAssetWithBalance(address token, address member) public view returns (ListedAssetDetails memory listedAssetDetails){
        listedAssetDetails.name = iERC20(token).name();
        listedAssetDetails.symbol = iERC20(token).symbol();
        listedAssetDetails.decimals = iERC20(token).decimals();
        listedAssetDetails.totalSupply = iERC20(token).totalSupply();
        listedAssetDetails.balance = iERC20(token).balanceOf(member);
        listedAssetDetails.tokenAddress = token;
        listedAssetDetails.hasClaimed = iSPARTA(member).mapAddressHasClaimed();
        return listedAssetDetails;
    }

    function getGlobalDetails() public view returns (GlobalDetails memory globalDetails){
        globalDetails.totalStaked = iSROUTER(ROUTER).totalStaked();
        globalDetails.totalVolume = iSROUTER(ROUTER).totalVolume();
        globalDetails.totalFees = iSROUTER(ROUTER).totalFees();
        globalDetails.unstakeTx = iSROUTER(ROUTER).unstakeTx();
        globalDetails.stakeTx = iSROUTER(ROUTER).stakeTx();
        globalDetails.swapTx = iSROUTER(ROUTER).swapTx();
        return globalDetails;
    }

    function getPool(address token) public view returns(address payable pool){
        return iSROUTER(ROUTER).getPool(token);
    }
    function tokenCount() public view returns (uint256 count){
        return iSROUTER(ROUTER).tokenCount();
    }
    function allTokens() public view returns (address[] memory _allTokens){
        return tokensInRange(0, iSROUTER(ROUTER).tokenCount()) ;
    }
    function tokensInRange(uint start, uint count) public view returns (address[] memory someTokens){
        if(start.add(count) > tokenCount()){
            count = tokenCount().sub(start);
        }
        address[] memory result = new address[](count);
        for (uint i = 0; i < count; i++){
            result[i] = iSROUTER(ROUTER).getToken(i);
        }
        return result;
    }
    function allPools() public view returns (address[] memory _allPools){
        return poolsInRange(0, tokenCount());
    }
    function poolsInRange(uint start, uint count) public view returns (address[] memory somePools){
        if(start.add(count) > tokenCount()){
            count = tokenCount().sub(start);
        }
        address[] memory result = new address[](count);
        for (uint i = 0; i<count; i++){
            result[i] = getPool(iSROUTER(ROUTER).getToken(i));
        }
        return result;
    }

    function getPoolData(address token) public view returns(PoolDataStruct memory poolData){
        address payable pool = getPool(token);
        poolData.poolAddress = pool;
        poolData.tokenAddress = token;
        poolData.genesis = iSPOOL(pool).genesis();
        poolData.baseAmt = iSPOOL(pool).baseAmt();
        poolData.tokenAmt = iSPOOL(pool).tokenAmt();
        poolData.baseAmtStaked = iSPOOL(pool).baseAmtStaked();
        poolData.tokenAmtStaked = iSPOOL(pool).tokenAmtStaked();
        poolData.fees = iSPOOL(pool).fees();
        poolData.volume = iSPOOL(pool).volume();
        poolData.txCount = iSPOOL(pool).txCount();
        poolData.poolUnits = iERC20(pool).totalSupply();
        return poolData;
    }

    function getMemberShare(address token, address member) public view returns(uint baseAmt, uint tokenAmt){
        address pool = getPool(token);
        uint units = iERC20(pool).balanceOf(member);
        return getPoolShare(token, units);
    }

    function getPoolShare(address token, uint units) public view returns(uint baseAmt, uint tokenAmt){
        address payable pool = getPool(token);
        baseAmt = calcShare(units, iERC20(pool).totalSupply(), iSPOOL(pool).baseAmt());
        tokenAmt = calcShare(units, iERC20(pool).totalSupply(), iSPOOL(pool).tokenAmt());
        return (baseAmt, tokenAmt);
    }

    function getPoolShareAssym(address token, uint units, bool toBase) public view returns(uint baseAmt, uint tokenAmt, uint outputAmt){
        address payable pool = getPool(token);
        if(toBase){
            baseAmt = calcAsymmetricShare(units, iERC20(pool).totalSupply(), iSPOOL(pool).baseAmt());
            tokenAmt = 0;
            outputAmt = baseAmt;
        } else {
            baseAmt = 0;
            tokenAmt = calcAsymmetricShare(units, iERC20(pool).totalSupply(), iSPOOL(pool).tokenAmt());
            outputAmt = tokenAmt;
        }
        return (baseAmt, tokenAmt, outputAmt);
    }

    function getMemberData(address token, address member) public view returns(MemberDataStruct memory memberData){
        address payable pool = getPool(token);
        memberData.baseAmtStaked = iSPOOL(pool).getBaseAmtStaked(member);
        memberData.tokenAmtStaked = iSPOOL(pool).getTokenAmtStaked(member);
        memberData.stakerUnits = iERC20(pool).balanceOf(member);
        return memberData;
    }

    function getPoolAge(address token) public view returns (uint daysSinceGenesis){
        address payable pool = getPool(token);
        uint genesis = iSPOOL(pool).genesis();
        if(now < genesis.add(86400)){
            return 1;
        } else {
            return (now.sub(genesis)).div(86400);
        }
    }

    function getPoolROI(address token) public view returns (uint roi){
        address payable pool = getPool(token);
        uint _baseStart = iSPOOL(pool).baseAmtStaked().mul(2);
        uint _baseEnd = iSPOOL(pool).baseAmt().mul(2);
        uint _ROIS = (_baseEnd.mul(10000)).div(_baseStart);
        uint _tokenStart = iSPOOL(pool).tokenAmtStaked().mul(2);
        uint _tokenEnd = iSPOOL(pool).tokenAmt().mul(2);
        uint _ROIA = (_tokenEnd.mul(10000)).div(_tokenStart);
        return (_ROIS + _ROIA).div(2);
   }

   function getPoolAPY(address token) public view returns (uint apy){
        uint avgROI = getPoolROI(token);
        uint poolAge = getPoolAge(token);
        return (avgROI.mul(365)).div(poolAge);
   }

    function getMemberROI(address token, address member) public view returns (uint roi){
        MemberDataStruct memory memberData = getMemberData(token, member);
        uint _baseStart = memberData.baseAmtStaked.mul(2);
        if(isMember(token, member)){
            (uint _baseShare, uint _tokenShare) = getMemberShare(token, member);
            uint _baseEnd = _baseShare.mul(2);
            uint _ROIS = 0; uint _ROIA = 0;
            if(_baseStart > 0){
                _ROIS = (_baseEnd.mul(10000)).div(_baseStart);
            }
            uint _tokenStart = memberData.tokenAmtStaked.mul(2);
            uint _tokenEnd = _tokenShare.mul(2);
            if(_tokenStart > 0){
                _ROIA = (_tokenEnd.mul(10000)).div(_tokenStart);
            }
            return (_ROIS + _ROIA).div(2);
        } else {
            return 0;
        }
    }

    function isMember(address token, address member) public view returns(bool){
        address payable pool = getPool(token);
        if (iERC20(pool).balanceOf(member) > 0){
            return true;
        } else {
            return false;
        }
    }

    function calcValueInBase(address token, uint amount) public view returns (uint value){
       address payable pool = getPool(token);
       return iSPOOL(pool).calcValueInBase(amount);
    }

    function calcValueInToken(address token, uint amount) public view returns (uint value){
        address payable pool = getPool(token);
        return iSPOOL(pool).calcValueInToken(amount);
    }

    function calcTokenPPinBase(address token, uint amount) public view returns (uint _output){
        address payable pool = getPool(token);
        return  iSPOOL(pool).calcTokenPPinBase(amount);
   }

    function calcBasePPinToken(address token, uint amount) public view returns (uint _output){
        address payable pool = getPool(token);
        return  iSPOOL(pool).calcBasePPinToken(amount);
    }





    function calcPart(uint bp, uint total) public pure returns (uint part){
        // 10,000 basis points = 100.00%
        require((bp <= 10000) && (bp > 0), "Must be correct BP");
        return calcShare(bp, 10000, total);
    }

    function calcShare(uint part, uint total, uint amount) public pure returns (uint share){
        // share = amount * part/total
        return(amount.mul(part)).div(total);
    }

    function  calcSwapOutput(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * X * Y )/(x + X)^2
        uint numerator = x.mul(X.mul(Y));
        uint denominator = (x.add(X)).mul(x.add(X));
        return numerator.div(denominator);
    }

    function  calcSwapFee(uint x, uint X, uint Y) public pure returns (uint output){
        // y = (x * x * Y) / (x + X)^2
        uint numerator = x.mul(x.mul(Y));
        uint denominator = (x.add(X)).mul(x.add(X));
        return numerator.div(denominator);
    }

    function calcStakeUnits(uint a, uint A, uint v, uint V) public pure returns (uint units){
        // units = ((V + A) * (v * A + V * a))/(4 * V * A)
        // (part1 * (part2 + part3)) / part4
        uint part1 = V.add(A);
        uint part2 = v.mul(A);
        uint part3 = V.mul(a);
        uint numerator = part1.mul((part2.add(part3)));
        uint part4 = 4 * (V.mul(A));
        return numerator.div(part4);
    }

    function calcAsymmetricShare(uint s, uint T, uint A) public pure returns (uint share){
        // share = (s * A * (2 * T^2 - 2 * T * s + s^2))/T^3
        // (part1 * (part2 - part3 + part4)) / part5
        uint part1 = s.mul(A);
        uint part2 = T.mul(T).mul(2);
        uint part3 = T.mul(s).mul(2);
        uint part4 = s.mul(s);
        uint numerator = part1.mul(part2.sub(part3).add(part4));
        uint part5 = T.mul(T).mul(T);
        return numerator.div(part5);
    }

}