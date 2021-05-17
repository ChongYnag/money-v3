#!/bin/bash
mobile=$(cat ./config.yaml | grep mobile | sed 's/.*\(...........\)$/\1/')

for config in $(cd coin && ls | grep .yaml)
do
    pm2 delete $mobile | grep ''
done