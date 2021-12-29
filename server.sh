#!/bin/bash

set -e

if [ "$1" == "prod" ]; then
    FLAG=""
else
    export FLASK_ENV=development
    FLAG="--wsgi"
fi

if [ "$2" == "" ]; then
    DIR=/workspace/sm-dev
else
    DIR=$2
fi

python -m smc.cli init --db $DIR/data/home/databases/smc.db

python -m smc.cli start $FLAG \
    --db $DIR/data/home/databases/smc.db \
    --externaldb $DIR/data/home/databases