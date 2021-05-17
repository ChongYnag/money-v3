// import {YamlLoader} from "https://deno.land/x/yaml_loader/mod.ts"
import {read} from "node-yaml"
// import {json2yaml} from "json2yaml";
let path = require('path');
let json2yaml = require('json2yaml')
let fs = require('fs');

// let CoinConfigYmal = process.argv;
let CoinConfigYmal = process.argv.splice(2)[0]
console.log("CoinConfigYmal",process.argv)
console.log("CoinConfigYmal",CoinConfigYmal)
export interface Config {
    api: {
        key: string;
        secret: string;
        url?: string
    }
    dingding: {
        token: string;
        mobile: number
    }
}

export interface CoinConfig {
    symbol: string;
    grid_buy_price: number;
    grid_sell_price: number;
    profit_ratio: number;
    double_throw_ratio: number;
    step: number;
    quantity: number[];
    precision: number;
}

export async function loadConfig(): Promise<Config> {
    return await read("../config.yaml") as Config
}

export async function loadCoinConfig(): Promise<CoinConfig> {
    return await read(CoinConfigYmal) as CoinConfig
}

export async function updateConfig(config: Config) {
    let PUBLIC_PATH = path.resolve(__dirname, '../config.yaml');
    return await fs.writeFileSync(PUBLIC_PATH, json2yaml.stringify(config),"utf-8",(err)=>{
        console.log("文件写入成功")
    })
}

export async function updateCoinConfig(config: CoinConfig) {
    // console.log(config);
    // console.log(CoinConfigYmal);
    // console.log(json2yaml.stringify(config));
    let PUBLIC_PATH = path.resolve(__dirname, CoinConfigYmal);
    
    return await fs.writeFileSync(PUBLIC_PATH, json2yaml.stringify(config),"utf-8",(err)=>{
        console.log("文件写入成功")
    })
}
