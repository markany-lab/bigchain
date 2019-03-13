#!/bin/bash
SCRIPT=`realpath -s $0`
SCRIPTPATH=`dirname ${SCRIPT}`
SCRIPTNAME=`basename ${SCRIPT}`
cd ${SCRIPTPATH}

. ./env.sh

geth --rpc \
  --verbosity 5 \
  --debug \
  --mine \
  --minerthreads=1 \
  --rpc \
  --rpcaddr "0.0.0.0" \
  --rpcport 8545 \
  --rpccorsdomain "*" \
  --rpcapi "personal,admin,db,eth,net,web3,miner,shh,txpool,debug" \
  --ws \
  --wsaddr "0.0.0.0" \
  --wsport 8546 \
  --wsorigins "*" \
  --wsapi "personal,admin,db,eth,net,web3,miner,shh,txpool,debug" \
  --nodiscover \
  --networkid 1943 \
  --maxpeers 0 \
  --datadir $DATADIR \
  console 2>> $LOGFILE
