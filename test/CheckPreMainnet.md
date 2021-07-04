Checklist before mainnet:

## BONDVAULT ##
Nothing

## DAO ##
DAO.bondingPeriodSeconds
DAO.coolOffPeriod
DAO.erasToEarn
DAO.majorityFactor
DAO.daoClaim
DAO.daoFee
DAO.secondsPerEra
DAO.cancelProposal | mapPID_startTime[currentProposal] + 600
DAO._increaseSpartaAllocation | _2point5m

## DAOVAULT ##
DAOVAULT.withdraw | mapMember_depositTime[member][pool] + 86400 

## POOL ##
POOL._addPoolMetrics | block.timestamp <= lastMonth + 2592000

## POOLFACTORY ##
POOLFACTORY.curatedPoolSize
POOLFACTORY.createPoolADD | inputBase >= (10000*10**18)

## RESERVE ##
RESERVE.emissions

## ROUTER ##
ROUTER.secondsPerEra
ROUTER.maxTrades
ROUTER.eraLength
ROUTER.arrayFeeSize
ROUTER.revenueDetails | block.timestamp <= lastMonth + 2592000

## SPARTA ##
SPARTA.emitting
SPARTA.minting
SPARTA.emissionCurve
SPARTA.secondsPerEra

## SYNTH ##
SYNTH.realise | premium > 10**18

## SYNTHFACTORY ##
Nothing

## SYNTHVAULT ##
SYNTHVAULT.minimumDepositTime
SYNTHVAULT.erasToEarn
SYNTHVAULT.vaultClaim
SYNTHVAULT._addVaultMetrics | block.timestamp <= lastMonth + 2592000

## UTILS ##
UTILS.
UTILS.
UTILS.
UTILS.