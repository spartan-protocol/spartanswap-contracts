



1) Deploy BEP2
2) Deploy BEP20
3) Bind BEP2
4) Approve bind BEP20
5) Check BEP2 binding success
6) Cross-chain transfer


https://testnet-explorer.binance.org/asset/CAN-FFE // CAN 100m

0x952cC939A090adc4e27f568102eF55f5569875f6 // CAN 100m

./tbnbcli-7 bridge bind --symbol CAN-FFE  --amount 0 --expire-time 1599274717 --contract-decimals 18 --from testnet-minter --chain-id Binance-Chain-Ganges --contract-address 0x952cC939A090adc4e27f568102eF55f5569875f6 --node http://data-seed-pre-0-s3.binance.org:80

  
0x952cC939A090adc4e27f568102eF55f5569875f6 // approve()
0x0000000000000000000000000000000000001008 
-1

0x0000000000000000000000000000000000001008 // approveBind()
0x952cC939A090adc4e27f568102eF55f5569875f6
CAN-FFE 

./tbnbcli-7 token info --symbol CAN-FFE --trust-node --node http://data-seed-pre-0-s3.binance.org:80

=========

https://testnet-explorer.binance.org/asset/BOLT-80D BOLT 100m

0x4D9a8e9FE499f88786B2C9693FfF5321C4bcCC30 // BOLT 100m

./tbnbcli-7 bridge bind --symbol BOLT-80D  --amount 0 --expire-time 1599278953 --contract-decimals 18 --from testnet-minter --chain-id Binance-Chain-Ganges --contract-address 0x4D9a8e9FE499f88786B2C9693FfF5321C4bcCC30 --node http://data-seed-pre-0-s3.binance.org:80

  
0x4D9a8e9FE499f88786B2C9693FfF5321C4bcCC30 // approve()
0x0000000000000000000000000000000000001008 
-1

0x0000000000000000000000000000000000001008 // approveBind()
0x4D9a8e9FE499f88786B2C9693FfF5321C4bcCC30
BOLT-80D 

./tbnbcli-7 token info --symbol BOLT-80D --trust-node --node http://data-seed-pre-0-s3.binance.org:80
