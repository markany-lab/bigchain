#!/bin/bash

# Set Ethereum data directory and file
DATADIR=$PWD/data
USER_DEF_KEY_DIR=$PWD/user_defined_keys
LOGFILE=./geth.log
KEYFILES=./keyfiles.json
GENESISFILE=./genesis.json
GENESISTEMP=./template_genesis.json

# Set default three accounts
ACCOUNT1_PW=Alice
ACCOUNT2_PW=Bob
ACCOUNT3_PW=Carlos
# set balace to 100 eth
DEF_BALANCE=100000000000000000000
