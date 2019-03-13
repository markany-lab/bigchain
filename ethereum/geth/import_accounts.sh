#!/bin/bash
SCRIPT=`realpath -s $0`
SCRIPTPATH=`dirname ${SCRIPT}`
SCRIPTNAME=`basename ${SCRIPT}`
cd ${SCRIPTPATH}

. ./env.sh

# import user defined keys
geth account import  --datadir $DATADIR --password <(echo $ACCOUNT1_PW) $USER_DEF_KEY_DIR/key1.priv
geth account import  --datadir $DATADIR --password <(echo $ACCOUNT2_PW) $USER_DEF_KEY_DIR/key2.priv
geth account import  --datadir $DATADIR --password <(echo $ACCOUNT3_PW) $USER_DEF_KEY_DIR/key3.priv
