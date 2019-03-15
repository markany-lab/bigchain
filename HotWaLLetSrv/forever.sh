#!/bin/bash

SCRIPT=`realpath -s ${0}`
SCRIPTPATH=`dirname ${SCRIPT}`
cd ${SCRIPTPATH}

NOW=`date +%y%m%d-%H%M%S`

forever stopall
forever list
forever start -p ${SCRIPTPATH} -l ./log/${NOW}.log -a ./app.js
