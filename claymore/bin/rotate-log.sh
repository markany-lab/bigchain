#!/bin/bash

SCRIPT=`realpath -s $0`
SCRIPTPATH=`dirname ${SCRIPT}`
SCRIPTNAME=`basename ${SCRIPT}`
cd ${SCRIPTPATH}

NOW=`date +%y%m%d-%H%M%S`
SRC="miner.log"
TGT=`echo ${SRC//.log/}`
TGTPATH="./log/${TGT}.${NOW}.log"
./toggle-log.sh ${SRC} ${TGTPATH}
