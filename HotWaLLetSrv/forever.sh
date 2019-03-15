#!/bin/bash

SCRIPT=`realpath -s ${0}`
SCRIPTPATH=`dirname ${SCRIPT}`
cd ${SCRIPTPATH}

NOW=`date +%y%m%d-%H%M%S`

echo '> stop all forever process'
forever stopall
echo '> list forever process'
forever list
echo '> start hot wallwt server'
forever start -p ${SCRIPTPATH} -l ./log/${NOW}.log -a ./app.js
