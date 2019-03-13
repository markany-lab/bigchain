#!/bin/bash

SCRIPT=`realpath -s $0`
SCRIPTPATH=`dirname ${SCRIPT}`
SCRIPTNAME=`basename ${SCRIPT}`
cd ${SCRIPTPATH}

function print_usage()
{
        echo "usage ./${SCRIPTNAME} source taget"
        exit 1
}

SRC=${1}
TGT=${2}

if [ "${SRC}" = "" ]; then
        print_usage
fi
echo "source file name: ${SRC}"

if [ "${TGT}" = "" ]; then
        print_usage
fi
echo "tagret file name: ${TGT}"

if [ -f "${SRC}" ]; then
        cp ${SRC} ${TGT}
        cat /dev/null > ${SRC}
fi
