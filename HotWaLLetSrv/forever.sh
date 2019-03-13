#!/bin/bash

SCRIPT=`realpath -s ${0}`
SCRIPTPATH=`dirname ${SCRIPT}`
cd ${SCRIPTPATH}

NOW=`date +%y%m%d-%H%M%S`

./node_modules/.bin/forever start -p ${SCRIPTPATH} -l ./log/${now}.log -a ./app.js
