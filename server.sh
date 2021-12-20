#!/bin/bash

set -e

export FLASK_ENV=development

python -m smc.cli init --db /workspace/sm-dev/data/home/databases/smc.db

python -m smc.cli start --wsgi \
    --db /workspace/sm-dev/data/home/databases/smc.db \
    --externaldb /workspace/sm-dev/data/home/databases