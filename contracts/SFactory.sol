// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.8;

import "./SPool.sol";

contract SFactory {

    using SafeMath for uint;

    address public SPARTAN;
    address public MATH;

    mapping(address=>address) private mapToken_Pool;

    constructor (address spartan, address math) public payable {
        SPARTAN = spartan; //0x3E2e792587Ceb6c1090a8A42F3EFcFad818d266D;
        MATH = math; //0x17218e58Fdf07c989faCca25De4c6FdB06502186;
    }

    function deployPool(uint inputSpartan, uint inputAsset, address token) public payable returns(address payable newPoolAddress){
        require(token != SPARTAN, "Token must not be Sparta");
        require((inputAsset > 0 && inputSpartan > 0), "Must get both assets for new pool");
        SPool newPool = new SPool(SPARTAN, token, MATH);
        address newPoolAddr = address(newPool);
        newPoolAddress = address(uint160(newPoolAddr));
        mapToken_Pool[token] = newPoolAddress;
        _createPool(inputSpartan, inputAsset, token, newPoolAddress);
        return newPoolAddress;
    }

    function _createPool(uint _inputSpartan, uint _inputAsset, address _token, address payable _pool) internal {
        SPool newPool = SPool(_pool);
        uint _actualInputAsset = _handleTransferIn(_token, _inputAsset);
        uint _actualInputSpartan = _handleTransferIn(SPARTAN, _inputSpartan);
        if(_token == address(0)){
            ERC20(SPARTAN).approve(_pool, _actualInputSpartan);
            newPool.stakeForMember{value:_actualInputAsset}(_actualInputSpartan, _actualInputAsset, msg.sender);
        } else {
            ERC20(_token).approve(_pool, _actualInputAsset);
            ERC20(SPARTAN).approve(_pool, _actualInputSpartan);
            newPool.stakeForMember(_actualInputSpartan, _actualInputAsset, msg.sender);
        }
    }

    function getPoolAddress(address token) public view returns(address pool){
        return mapToken_Pool[token];
    }

    //==================================================================================//
    // Universal Swapping Functions

    function swap(uint inputAmount, address fromAsset, address toAsset) public payable returns (uint outputAmount, uint fee) {
        require(fromAsset != toAsset, "Asset must not be the same");
        address addrFrom = getPoolAddress(fromAsset); address addrTo = getPoolAddress(toAsset);
        SPool fromPool = SPool(addrFrom); SPool toPool = SPool(addrTo);
        uint _actualAmount = _handleTransferIn(fromAsset, inputAmount);
        if(fromAsset == SPARTAN){
            ERC20(SPARTAN).approve(addrTo, _actualAmount);                       // Approve pool to spend SPARTAN
            (outputAmount, fee) = toPool.buyTo(_actualAmount, msg.sender);      // Buy to token
        } else if(toAsset == SPARTAN) {
            ERC20(fromAsset).approve(addrFrom, _actualAmount);                  // Approve pool to spend token
            (outputAmount, fee) = fromPool.sellTo(_actualAmount, msg.sender);   // Sell to token
        } else {
            ERC20(fromAsset).approve(addrFrom, _actualAmount);                  // Approve pool to spend token
            (uint _yy, uint _feey) = fromPool.sell(_actualAmount);              // Sell to SPARTAN
            ERC20(SPARTAN).approve(addrTo, _yy);                                 // Approve pool to spend SPARTAN
            (uint _zz, uint _feez) = toPool.buyTo(_yy, msg.sender);             // Buy to token
            outputAmount = _zz;
            fee = _feez + toPool.calcValueInAsset(_feey);
        }
        return (outputAmount, fee);
    }

    //==================================================================================//
    // Asset Transfer Functions

    function _handleTransferIn(address _asset, uint _amount) internal returns(uint actual){
        if(_amount > 0) {
            if(_asset == address(0)){
                require((_amount == msg.value), "Must get Eth");
                actual = _amount;
            } else {
                uint startBal = ERC20(_asset).balanceOf(address(this)); 
                ERC20(_asset).transferFrom(msg.sender, address(this), _amount); 
                actual = ERC20(_asset).balanceOf(address(this)).sub(startBal);
            }
        }
    }

    function _handleTransferOut(address _asset, uint _amount, address payable _recipient) internal {
        if(_amount > 0) {
            if (_asset == address(0)) {
                _recipient.call{value:_amount}(""); 
            } else {
                ERC20(_asset).transfer(_recipient, _amount);
            }
        }
    }

}