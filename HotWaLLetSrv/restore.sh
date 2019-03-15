#!/bin/bash
SCRIPT=`realpath -s ${0}`
SCRIPTPATH=`dirname ${SCRIPT}`
cd ${SCRIPTPATH}

mongorestore --host 127.0.0.1 --port 27017 --db waLLet --drop ./mongo_dump/waLLet
