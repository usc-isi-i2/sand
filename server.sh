#!/bin/bash

set -e

if [ "$1" == "prod" ]; then
    FLAG=""
else
    export FLASK_ENV=development
    FLAG="--wsgi"
fi

python -m smc.cli init --db /workspace/sm-dev/data/home/databases/smc.db

python -m smc.cli start $FLAG \
    --db /workspace/sm-dev/data/home/databases/smc.db \
    --externaldb /workspace/sm-dev/data/home/databases