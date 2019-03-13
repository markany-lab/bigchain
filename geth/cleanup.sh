#!/bin/bash
SCRIPT=`realpath -s $0`
SCRIPTPATH=`dirname ${SCRIPT}`
SCRIPTNAME=`basename ${SCRIPT}`
cd ${SCRIPTPATH}

. ./env.sh

if [ -d "$DATADIR" ]; then
rm -rf $DATADIR
fi
if [ -f "$LOGFILE" ]; then
rm -rf $LOGFILE
fi
if [ -f "$KEYFILES" ]; then
rm -rf $KEYFILES
fi
if [ -f "$GENESISFILE" ]; then
rm -rf $GENESISFILE
fi
