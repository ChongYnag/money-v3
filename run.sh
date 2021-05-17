#!/bin/bash
export RUN_ENV='production' && ts-node src/main.ts ../coin/$1 $2
# export RUN_ENV='production' && ts-node src/main.ts ../coin/coin.yaml