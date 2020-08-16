do(pool, aIn, vIn, aOut, vOut)

stake: do(pool, 10, 10, 0, 0)
asymmStake: do(pool, 0, 10, 0, 0)
stake&Swap: do(pool, 10, 10, 0, 5)
swap: do(pool, 10, 0, 0, 10)
withdraw: do(pool, 0, 0, 10, 10)
asymmWithdraw: do(pool, 0, 0, 0, 20)
partialAsymmWithdraw: do(pool, 0, 0, 5, 15)
partialWithdraw: do(pool, 0, 0, 5, 5)

function do(address pool, uint assetIn, uint spartanIn, uint assetOut, uint spartanOut) public {
        // Firstly add liquidity
        _addLiquidity(pool, assetIn, spartanIn);

        // Then get staking units
        uint _stakerUnits = mapAsset_ExchangeData[asset].stakerUnits[msg.sender];
        uint _total = mapAsset_ExchangeData[_asset].poolUnits;

        // Check that total claim doesn't exceed ownership
        require(assetOut.add(spartanOut) <= _stakerUnits.mul(2), "Must be less than double");

        // Remove assets from each side
        uint outputAsset = _removeLiquidityForSide(getUnits(assetOut, _stakerUnits));
        uint outputSparta = _removeLiquidityForSide(getUnits(spartanOut, _stakerUnits));
        
        // Get latest balances
        uint _balanceSPARTA = mapAsset_ExchangeData[_asset].balanceSPARTA;
        uint _balanceAsset = mapAsset_ExchangeData[_asset].balanceAsset;

        if(spartanOut > _stakerUnits) {              // Process asymm withdrawal
            // Get amount of asset to swap
            uint assetToSwap = getShare(_stakerUnits.sub(assetOut), _total, _balanceAsset)
            // Swap to spartan
            _swapAssetToSPARTA(pool, assetToSwap)
        } else if (assetOut > _stakerUnits) {
            // get amount of spartan
            uint spartanToSwap = getShare(_stakerUnits.sub(spartanOut), _total, _balanceSPARTA)
            // swap to asset
            _swapSpartaToAsset(pool, spartanToSwap)
        }
    }

    function getUnits(uint inputUnits, uint stakerUnits) public returns (uint units){
        if(inputUnits = stakerUnits){
            return inputUnits
        } else {
            return inputUnits.mod(stakerUnits)
        }
    }

    function removeLiquidityAsymmetric(address asset, uint unitsSparta, uint unitsAsset) public returns (bool success){
        uint _stakerUnits = mapAsset_ExchangeData[asset].stakerUnits[msg.sender]
        uint _total = mapAsset_ExchangeData[_asset].poolUnits;
        uint _balanceSPARTA = mapAsset_ExchangeData[_asset].balanceSPARTA;
        uint _balanceAsset = mapAsset_ExchangeData[_asset].balanceAsset;
        uint _outputSPARTA; uint _outputAsset; 
        if(toSparta){
            _outputSPARTA = getAsymmetricShare(_stakerUnits, _total, _balanceSPARTA);
            _outputAsset = 0;
        } else {
            _outputSPARTA = 0;
            _outputAsset = getAsymmetricShare(_stakerUnits, _total, _balanceAsset);
        }
        _handleTransferOut(asset, _outputSPARTA, _outputAsset, msg.sender)
        return true;
    }




