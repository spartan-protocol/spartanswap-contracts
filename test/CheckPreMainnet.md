Checklist before mainnet:

## BONDVAULT ##
Nothing of note

## DAO ##
DAO.bondingPeriodSeconds (6 months)
DAO.coolOffPeriod (3 to 7 days?)
DAO.erasToEarn (30 days)
DAO.majorityFactor (6666bp)
DAO.daoClaim (1000bp)
DAO.daoFee (100 SPARTA)
DAO.secondsPerEra (1 Day)
DAO.cancelProposal | mapPID_startTime[currentProposal] (14 to 30 days?)
DAO._increaseSpartaAllocation | _2point5m

## DAOVAULT ##
DAOVAULT.withdraw | mapMember_depositTime[member][pool] + 86400 (1 day)

## POOL ##
POOL._addPoolMetrics | block.timestamp <= lastMonth + 2592000 (1 month)

## POOLFACTORY ##
POOLFACTORY.curatedPoolSize
POOLFACTORY.createPoolADD | inputBase >= (10000*10**18)

## RESERVE ##
RESERVE.emissions (Turn on when vault weight is distributed enough)
Make public announcement and give users maybe 24hours to get their weight in before they can harvest

## ROUTER ##
ROUTER.maxTrades
ROUTER.eraLength (30 days)
ROUTER.arrayFeeSize
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
SYNTHVAULT.minimumDepositTime (1 hour?)
SYNTHVAULT.erasToEarn (30 days)
SYNTHVAULT.vaultClaim (1000bp)
SYNTHVAULT._addVaultMetrics | block.timestamp <= lastMonth + 2592000 (1 month)

## UTILS ##
Nothing of note