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

if [ "$3" == "" ]; then
    PORT=5524
else
    PORT=$3
fi


DB=$DIR/data/home/sand/db.sqlite

if [ ! -f "$DB" ];
then
    DIRNAME=$(dirname $DB)
    if [ ! -d "$DIRNAME" ]
    then
        mkdir -p $DIRNAME
    fi

    python -m sand init --db $DB

    python -m sand create --db $DB --description 'auto-labeled wikipedia tables' wtauto-200
    python -m sand load --db $DB -p wtauto-200 --dataset $DIR/data/home/datasets/wtauto-200
fi

python -m sand start $FLAG \
    --db $DB \
    --externaldb $DIR/data/home/databases \
    -p $PORT

# python -m sand init --db $DIR/data/home/sand-demo/sand.db
# python -m sand start $FLAG \
#     --db $DIR/data/home/sand-demo/sand.db \
#     --externaldb $DIR/data/home/sand-demo #--externaldb-proxy