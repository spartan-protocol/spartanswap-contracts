pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;
import "./IContracts.sol";
import "@nomiclabs/buidler/console.sol";

contract Leverage {
    using SafeMath for uint256;
    address public BASE;
    address public WBNB;

constructor (address _base, address _wbnb) public payable {
        BASE = _base;
        WBNB = _wbnb;
}

function _DAO() internal view returns(iDAO) {
        return iBASE(BASE).DAO();
    }

function leverageUp(uint amount, address synth, address pool) public returns (uint outPut){
    uint256 actual = _handleTransferIn(synth, amount, address(this));
    iBEP20(synth).approve(_DAO().ROUTER(), actual);
    uint baseOut = iROUTER(_DAO().ROUTER()).swapSynthToBase(actual, synth);
    address token = iPOOL(pool).TOKEN();
    iBEP20(BASE).approve(_DAO().ROUTER(), baseOut);
    uint tokenAmount = iUTILS(_DAO().UTILS()).calcSwapValueInToken(token,baseOut.mul(5001).div(10000));
    iBEP20(token).approve(_DAO().ROUTER(), tokenAmount);
    outPut = iROUTER(_DAO().ROUTER()).addLiquidityAsym(baseOut, true,token);
    _handleTransferOut(pool, outPut, msg.sender);
    return outPut;
}

function leverageDown(uint amount, address synth, address pool) public returns (bool){
    uint256 actual = _handleTransferIn(pool, amount, address(this));
    address token = iPOOL(pool).TOKEN();
    iBEP20(pool).approve(_DAO().ROUTER(), actual);
     uint tokenAmount = iUTILS(_DAO().UTILS()).calcShare(amount, iBEP20(pool).totalSupply(), iPOOL(pool).tokenAmount());  
    iBEP20(token).approve(_DAO().ROUTER(), tokenAmount); 
    uint baseOut = iROUTER(_DAO().ROUTER()).removeLiquidityAsym(actual, true,  token);
    iBEP20(BASE).approve(_DAO().ROUTER(), baseOut);
    uint synthOUT = iROUTER(_DAO().ROUTER()).swapBaseToSynth(baseOut, synth);
    _handleTransferOut(synth, synthOUT, msg.sender );
}
function _handleTransferIn(address _token, uint256 _amount, address toAddress) internal returns(uint256 actual){
        if(_amount > 0) {
                uint startBal = iBEP20(_token).balanceOf(toAddress); 
                iBEP20(_token).transferFrom(msg.sender, toAddress, _amount); 
                actual = iBEP20(_token).balanceOf(toAddress).sub(startBal);
        }
    }
function _handleTransferOut(address _token, uint256 _amount, address _recipient) internal {
        if(_amount > 0) {
            
                iBEP20(_token).transfer(_recipient, _amount);
        
        }
}



     
}
