#!/bin/bash

SCRIPT=`realpath -s ${0}`
SCRIPTPATH=`dirname ${SCRIPT}`
cd ${SCRIPTPATH}

./node_modules/.bin/forever start -l ./app.log -a node ./app.js
