#!/bin/bash

VOWS=`which vows 2> /dev/null`
if [ ! -x "$VOWS" ]; then
    echo "vows not found in your path.  try:  npm install -g vows"
    exit 1
fi

for env in test_json test_mysql ; do
  export NODE_ENV=$env
  ./scripts/test_db_connectivity.js
  if [ $? = 0 ] ; then 
      echo "Testing with NODE_ENV=$env"
      for file in browserid/tests/*.js ; do
          vows $file
          if [[ $? != 0 ]] ; then
              exit 1
          fi
      done
  else
      echo "CANNOT TEST '$env' ENVIRONMENT: can't connect to the database"
  fi
done
