Checklist before mainnet:

## BONDVAULT ##
BONDVAULT.bondingPeriodSeconds (6 months)

## DAO ##
DAO.coolOffPeriod (3 to 7 days?)
DAO.majorityFactor (6666bp)
DAO.erasToEarn (30 days)
DAO.daoClaim (0bp initially)
DAO.daoFee (200 SPARTA?)
DAO.cancelPeriod (14 to 30 days?)
DAO.deposit() | block.timestamp + 60 (60s blockshift)
DAO.bond() | block.timestamp + 60 (60s blockshift)
DAO._handleTransferIn() | iBEP20(BASE).allowance(address(this), address(_ROUTER)) < 2.5 * 10**6 * 10**18
DAO._increaseSpartaAllocation | _2m (2 million)

## DAOVAULT ##
DAOVAULT.withdraw | mapMember_depositTime[member][pool] + 86400 (1 day)

## POOL ##
POOL.synthCap (3000bp)
POOL.baseCap (100000*10**18)
POOL.freezePoint (3000bp)
POOL.oneWeek (604800s)
POOL.mintSynth() | outputAmount = output * 9900 / 10000
POOL.burnSynth() | uint outputBase = output * 9500 / 10000
POOL.stirCauldron() | steamedSynths = 14400 * stirRate
POOL._addPoolMetrics | block.timestamp <= lastMonth + 2592000 (1 month)

## POOLFACTORY ##
POOLFACTORY.curatedPoolSize
POOLFACTORY.minBASE
POOLFACTORY.createPoolADD | inputToken > 100000 && inputBase >= minBASE

## RESERVE ##
RESERVE.emissions (Turn on when vault weight is distributed enough)
Make public announcement and give users maybe 24hours to get their weight in before they can harvest

## ROUTER ##
ROUTER.diviClaim
ROUTER.synthMinting
ROUTER.revenueDetails | block.timestamp <= lastMonth + 2592000 (1 month)

## SPARTA ##
SPARTA.emitting
SPARTA.minting
SPARTA.emissionCurve
SPARTA.secondsPerEra (1 day)

## SYNTH ##
SYNTH.realise | premium > 10**18 (1 unit)

## SYNTHFACTORY ##
Nothing of note

## SYNTHVAULT ##
SYNTHVAULT.minimumDepositTime (1 hour)
SYNTHVAULT.erasToEarn (30 days)
SYNTHVAULT.vaultClaim (0bp initially)
SYNTHVAULT._deposit() | block.timestamp > mapMemberSynth_lastTime[_member][_synth] + 10
SYNTHVAULT.harvestSingle() | block.timestamp > mapMemberSynth_lastTime[msg.sender][synth] + 10
SYNTHVAULT._addVaultMetrics | block.timestamp <= lastMonth + 2592000 (1 month)

## UTILS ##
UTILS.calcLiquidityUnits() | slipAdjustment > (9.8 * 10**17)