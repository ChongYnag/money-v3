import { Order } from './entity/Order';
import { getManager } from "typeorm";
import { CoinConfig, Config, loadCoinConfig, loadConfig, updateCoinConfig, updateConfig } from './load-config'
import { sign } from "./sign"
import Logger from './logger'
import { MAX_TIMES } from './constants'
import { money, sleep } from './utils'
import DingDing from "./dingding"
import { __PROD__ } from "./env"
const moment = require('moment')

const fetch = require('node-fetch');

// import Database from './database'

var qs = require('qs');

const dingding = new DingDing()
dingding.init()

export interface Service {
    config: Config;
    coinConfig: CoinConfig;
    name: string;
    loadConfig: () => void;
    fetch: (path: string, init: RequestInit) => Promise<Response>;
}

export enum SIDE {
    BUY = 'BUY',
    SELL = 'SELL'
}

interface TickerPriceResponse {
    symbol: string;
    price: number
}

interface GroupItem {
    symbol: string;
    orders: Array<OrderDetail>;
}

// 下单信息
interface OrderData {
    symbol: string;
    quantity: number;
    side?: SIDE;
    price: number;
    type?: string;
    timeInForce?: string
}

// 下单结果
interface OrderResponse {
    symbol: string;
    orderId: number;
    orderListId: number;
    clientOrderId: string;
    transactTime: number;
    price: string;
    origQty: string;
    executedQty: string;
    cummulativeQuoteQty: string;
    status: string;
    timeInForce: string;
    type: string;
    side: SIDE;
    fills: []
}

enum OrderStatus {
    'FILLED' = 'FILLED',
    'NEW' = 'NEW',
}

// 订单详情
export interface OrderDetail {
    symbol: string,
    orderId: number,
    orderListId: number,
    clientOrderId: string,
    price: string,
    origQty: string,
    executedQty: string,
    cummulativeQuoteQty: string,
    status: OrderStatus,
    timeInForce: string,
    type: string,
    side: SIDE,
    stopPrice: string,
    icebergQty: string,
    time: string,
    updateTime: string,
    isWorking: boolean,
    origQuoteOrderQty: string
}

export class ResponseError extends Error {
    code: ResponseErrorCode;

    constructor(message: string, code: ResponseErrorCode) {
        super(message)
        this.code = code;
    }
}

export enum ResponseErrorCode {
    InsufficientBalance = -2010,
    ErrorTickerPrice = -9999,
}

export interface Balance {
    asset: string;
    free: string;
    locked: string;
}

export interface AccountResponse {
    makerCommission: number;
    takerCommission: number;
    buyerCommission: number;
    sellerCommission: number;
    canTrade: boolean;
    canWithdraw: boolean;
    canDeposit: boolean;
    updateTime: number;
    accountType: string;
    balances: Balance[];
}

export class BinanceService implements Service {
    config!: Config;
    coinConfig!: CoinConfig;
    name = 'Binance';

    async init() {
        await this.loadConfig()
        await this.loadCoinConfig()
        await this.statisticsOrders()
        await this.statisticsAccount()
        Logger.info('启动配置', this.coinConfig)
    }

    async loadConfig() {
        this.config = await loadConfig()
        Logger.debug('app config:', this.config)
    }

    async loadCoinConfig() {
        this.coinConfig = await loadCoinConfig()
    }

    async updateConfig(config: Config) {
        return await updateConfig(config)
    }

    async updateCoinConfig(config: CoinConfig) {
        console.log(config)
        return await updateCoinConfig(config)
    }

    async fetch(path: string, init: RequestInit): Promise<Response> {
        return await fetch(this.config.api.url + path, init)
    }

    async get<T>(path: string, query: Record<string, unknown> = {}, signed = false): Promise<T> {
        if (signed) {
            query = {
                timestamp: Date.now(),
                ...query
            }
            const queryString = qs.stringify(query)
            const signature = sign(queryString, this.config.api.secret || '')
            const signedQueryString = qs.stringify({
                ...query,
                signature
            })

            return await (await this.fetch(path + '?' + signedQueryString, {
                headers: {
                    'X-MBX-APIKEY': this.config.api.key || ''
                }
            })).json()
        } else {
            return await (await this.fetch(path + '?' + qs.stringify(query), {
                headers: {
                    'X-MBX-APIKEY': this.config.api.key || ''
                },
            })).json()
        }
    }

    async post<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
        const postData = {
            ...body,
            timestamp: Date.now()
        }
        const signature = sign(qs.stringify(postData), this.config.api.secret || '')

        const signedPostData = qs.stringify({
            ...postData,
            signature
        })
        console.log("signedPostData", signedPostData)
        return await (await this.fetch(path, {
            method: 'POST',
            headers: {
                'X-MBX-APIKEY': this.config.api.key || ''
            },
            body: signedPostData
        })).json()
    }

    async delete<T>(path: string, body: Record<string, unknown>): Promise<T> {
        const postData = {
            ...body,
            timestamp: Date.now()
        }
        const signature = sign(qs.stringify(postData), this.config.api.secret || '')

        const signedPostData = qs.stringify({
            ...postData,
            signature
        })

        return await (await this.fetch(path, {
            method: 'DELETE',
            headers: {
                'X-MBX-APIKEY': this.config.api.key || ''
            },
            body: signedPostData
        })).json()
    }

    async getTickerPrice(symbol: string): Promise<TickerPriceResponse> {
        try {
            return await this.get('/api/v3/ticker/price', {
                symbol
            })
        } catch (e) {
            console.error(e)
            throw new ResponseError('获取价格失败', ResponseErrorCode.ErrorTickerPrice)
        }

    }

    async buyLimit(orderData: OrderData): Promise<OrderResponse> {
        orderData.price = this.limitPricePrecision(orderData.price)
        const res = await this.post('/api/v3/order', {
            ...orderData,
            side: SIDE.BUY,
            type: 'LIMIT',
            timeInForce: 'GTC',
        }) as OrderResponse

        if (!res.orderId) {
            // @ts-ignore
            throw new ResponseError(res.msg, res.code)
        }

        return res
    }

    async sellLimit(orderData: OrderData): Promise<OrderResponse> {
        orderData.price = this.limitPricePrecision(orderData.price)
        console.log("OrderData", {
            ...orderData,
            side: SIDE.SELL,
            type: 'LIMIT',
            timeInForce: 'GTC',
        })
        const res = await this.post('/api/v3/order', {
            ...orderData,
            side: SIDE.SELL,
            type: 'LIMIT',
            timeInForce: 'GTC',
        }) as OrderResponse
        if (!res.orderId) {
            // @ts-ignore
            throw new ResponseError(res.msg, res.code)
        }
        return res
    }

    async cancelLimit(symbol: string, orderId: number) {
        return await this.delete('/api/v3/order', {
            symbol,
            orderId
        })
    }

    async getOrderDetailById(symbol: string, orderId: number): Promise<OrderDetail> {
        return await this.get('/api/v3/order', {
            symbol,
            orderId
        }, true)
    }

    async getBalance(): Promise<AccountResponse> {
        return await this.get('/api/v3/account', {}, true)
    }

    async updateStep(step: number, dealPrice: number) {
        this.coinConfig.step += (step)
        if (this.coinConfig.step < 0) {
            this.coinConfig.step = 0
        }
        this.coinConfig.grid_buy_price = this.limitPricePrecision(dealPrice * (100 - this.coinConfig.double_throw_ratio) / 100)
        this.coinConfig.grid_sell_price = this.limitPricePrecision(dealPrice * (100 + this.coinConfig.profit_ratio) / 100)
        console.log(this.coinConfig)
        await this.updateCoinConfig(this.coinConfig)
        await this.loadCoinConfig()
        Logger.info('配置更新成功', this.coinConfig)
    }

    limitPricePrecision(price: number | string) {
        return +Number(price).toFixed(this.coinConfig.precision)
    }

    async checkOrderStatusAndUpdateConfig(orderId: number, orderData: OrderData, side: SIDE) {
        Logger.info(`开始检查${side}状态:`, orderData)

        const successCallback = async (dealOrder: OrderDetail) => {
            const dealPrice = parseFloat(String(+dealOrder.cummulativeQuoteQty / +dealOrder.executedQty))
            Logger.info(`${side}已成交! 挂单价: ${orderData.price} 实际成交价: ${dealPrice} 挂单数量: ${dealOrder.origQty} 实际成交数量: ${dealOrder.executedQty} 成交金额: ${dealOrder.cummulativeQuoteQty}`)
            await this.updateStep(side === SIDE.BUY ? 1 : -1, dealPrice)
            // await Database.insert(dealOrder)
            console.log(dealOrder)
            let od = new Order();
            od.ddId = String(this.config.dingding.mobile);
            for (let i in dealOrder) {
                od[i] = dealOrder[i]
            }
            od.updateTime = moment(od.updateTime).format('YYYY-MM-DD HH:mm:ss')
            od.time = moment(od.time).format('YYYY-MM-DD HH:mm:ss')
            const entityManager = getManager();
            await entityManager.save(od);
        }

        for (let i = 0; i < MAX_TIMES; i++) {
            const dealOrder = await this.getOrderDetailById(this.coinConfig.symbol, orderId)
            // 完全成交
            if (dealOrder.status === OrderStatus.FILLED) {
                await successCallback(dealOrder)
                return;
            } else {
                // 延迟2s
                await sleep(2 * 1000);
                Logger.debug(`检查${side}成交状态`)
            }
        }
        const dealOrder = await this.getOrderDetailById(this.coinConfig.symbol, orderId)
        // 超时部分成交
        if (+dealOrder.executedQty > 0) {
            await successCallback(dealOrder)
            return;
        } else {
            await this.cancelLimit(this.coinConfig.symbol, orderId)
            Logger.info('取消订单成功')
        }
    }

    async statisticsAccount() {
        try {
            // console.log((await this.getBalance()));
            const balances = (await this.getBalance()).balances.filter(it => +it.free > 0)
            let str = '资产信息:\n'
            let totalPrice = 0
            for (let key in balances) {
                const item = balances[key]
                const coin = item.asset
                let price;
                if (item.asset != 'USDT') {
                    price = (await this.getTickerPrice(`${coin}USDT`)).price
                } else {
                    price = 1
                }

                str += `${item.asset}: ${item.free}\n价格: ${price}\n合计: ${+price * +item.free}\n\n`
                totalPrice += (+price * +item.free)
            }
            str += `总计:${totalPrice}`
            console.log(str);
            await dingding.sendMessage(str)
        } catch (error) {
            console.log("error", error)
        }
    }

    async statisticsOrders() {
        try {
            await sleep(0)
            const entityManager = getManager();
            const rows = await entityManager.find(Order, { where: { ddId: String(this.config.dingding.mobile) } })
            console.log("rows", rows)
            if (rows.length > 0) {
                const map = {} as Record<string, GroupItem>
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i]
                    if (!Object.prototype.hasOwnProperty.call(map, row.symbol)) {
                        map[row.symbol] = {
                            symbol: row.symbol,
                            orders: []
                        }
                    }
                    map[row.symbol].orders.push(row)
                }

                for (const symbol in map) {
                    if (Object.prototype.hasOwnProperty.call(map, symbol)) {
                        const groupItem = map[symbol] as GroupItem
                        let sellCount = 0;
                        let sellAmont = 0;
                        let buyCount = 0;
                        let buyAmount = 0;
                        let totalCount = 0;
                        for (let i = 0; i < groupItem.orders.length; i++) {
                            totalCount++;
                            const currentRow = groupItem.orders[i]
                            if (currentRow.side === SIDE.SELL) {
                                sellCount++;
                                sellAmont += +(currentRow.cummulativeQuoteQty)
                            }
                            if (currentRow.side === SIDE.BUY) {
                                buyCount++;
                                buyAmount += +(currentRow.cummulativeQuoteQty)
                            }
                        }
                        Logger.info(
                            `币种: ${symbol}`,
                            `交易总笔数:${totalCount}`,
                            `卖出${sellCount}笔`,
                            `卖出总额:$${money(sellAmont)}`,
                            `买入${buyCount}笔`,
                            `买入总额:$${money(buyAmount)}`,
                            `盈利:$${money(sellAmont - buyAmount)}`
                        )
                    }
                }
            } else {
                Logger.info(
                    `币种: ${this.coinConfig.symbol}`,
                    `交易总笔数:0`,
                    `卖出:0笔`,
                    `卖出总额:0`,
                    `买入:0笔`,
                    `买入总额:0`,
                    `盈利:0`
                )
            }
        } catch (error) {

        }
    }
}
