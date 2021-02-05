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

function leverageUp(uint amount, address synth) public returns (bool){
    uint256 actual = _handleTransferIn(synth, amount, address(this));
    iBEP20(synth).approve(_DAO().ROUTER(), actual);
    uint baseOut = iROUTER(_DAO().ROUTER()).swapSynthToBase(actual, synth);
    address layerOne = iSYNTH(synth).LayerONE();
    address pool = iROUTER(_DAO().ROUTER()).getPool(layerOne); 
    iBEP20(BASE).approve(_DAO().ROUTER(), baseOut);
    iBEP20(WBNB).approve(_DAO().ROUTER(), baseOut);
    uint units = iROUTER(_DAO().ROUTER()).addLiquidityAsym(baseOut, true,layerOne);
    _handleTransferOut(pool, units, msg.sender );
}

function leverageDown(uint amount, address lpToken) public returns (bool){
    uint256 actual = _handleTransferIn(lpToken, amount, address(this));
    address token = iPOOL(lpToken).TOKEN();
    address synth = iSYNTHROUTER(_DAO().SYNTHROUTER()).getSynth(token);
    iBEP20(lpToken).approve(_DAO().ROUTER(), actual);
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
