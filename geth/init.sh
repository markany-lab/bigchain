#!/bin/bash
SCRIPT=`realpath -s $0`
SCRIPTPATH=`dirname ${SCRIPT}`
SCRIPTNAME=`basename ${SCRIPT}`
cd ${SCRIPTPATH}

. ./env.sh

mkdir -p $DATADIR

# create accounts
if [ $# -eq 0 ]; then
    echo "Example)"
    echo "$0 [new|user]"
    exit 1
fi

if [ $1 = "new" ]; then
    echo "Creating new accounts..."
    geth --datadir $DATADIR account new --password <(echo $ACCOUNT1_PW)
    geth --datadir $DATADIR account new --password <(echo $ACCOUNT2_PW)
    geth --datadir $DATADIR account new --password <(echo $ACCOUNT3_PW)
elif [ $1 = "user" ]; then
    echo "Importing accounts from user defined private keys."
    ./import_accounts.sh
else
    exit 1
fi

# export account files as JSON
./list_keyfiles.sh > $KEYFILES

# update account balance
cp $GENESISTEMP $GENESISFILE
ACCOUNT1=0x$(ls $DATADIR/keystore/ | sed -n 1p | cut -c 38-77)
ACCOUNT2=0x$(ls $DATADIR/keystore/ | sed -n 2p | cut -c 38-77)
ACCOUNT3=0x$(ls $DATADIR/keystore/ | sed -n 3p | cut -c 38-77)
BALANCE=$DEF_BALANCE
sed -i "s/__ACCOUNT1__/${ACCOUNT1}/g" $GENESISFILE
sed -i "s/__ACCOUNT2__/${ACCOUNT2}/g" $GENESISFILE
sed -i "s/__ACCOUNT3__/${ACCOUNT3}/g" $GENESISFILE
sed -i "s/__BALANCE__/${BALANCE}/g" $GENESISFILE

geth --datadir $DATADIR init $GENESISFILE
