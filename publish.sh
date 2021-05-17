#!/bin/bash
mobile=$(cat ./config.yaml | grep mobile | sed 's/.*\(...........\)$/\1/')
./stop.sh

for config in $(cd coin && ls | grep .yaml)
do
   pm2 start -f --namespace $mobile --name $config@$mobile ./run.sh -- ${config}
done