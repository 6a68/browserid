#!/bin/bash

VOWS=`which vows 2> /dev/null`
if [ ! -x "$VOWS" ]; then
    echo "vows not found in your path.  try:  npm install -g vows"
    exit 1
fi

for file in browserid/tests/*.js ; do
    vows $file
    if [[ $? != 0 ]] ; then
        exit 1
    fi
done
