#!/bin/bash
SCRIPT=`realpath -s $0`
SCRIPTPATH=`dirname ${SCRIPT}`
SCRIPTNAME=`basename ${SCRIPT}`
cd ${SCRIPTPATH}

nohup ../ethdcrminer64 -epool asia.ethash-hub.miningpoolhub.com:20535 -ewal markany.miner -eworker markany.miner -esm 2 -epsw x > ./miner.log 2>&1 &
