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

python -m sand init --db $DIR/data/home/databases/sand.db

python -m sand start $FLAG \
    --db $DIR/data/home/databases/sand.db \
    --externaldb $DIR/data/home/databases

# python -m sand init --db $DIR/data/home/sand-demo/sand.db

# python -m sand start $FLAG \
#     --db $DIR/data/home/sand-demo/sand.db \
#     --externaldb $DIR/data/home/sand-demo #--externaldb-proxy