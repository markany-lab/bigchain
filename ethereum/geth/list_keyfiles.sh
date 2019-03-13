#!/bin/bash
SCRIPT=`realpath -s $0`
SCRIPTPATH=`dirname ${SCRIPT}`
SCRIPTNAME=`basename ${SCRIPT}`
cd ${SCRIPTPATH}

. ./env.sh

python -c 'import os, json; print json.dumps(sorted(os.listdir("'$DATADIR'/keystore")))'
