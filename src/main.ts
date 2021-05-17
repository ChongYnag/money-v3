import "reflect-metadata";
import { loadConfig } from './load-config'
import { createConnection } from "typeorm";
import { User } from "./entity/User";

import { BinanceService, ResponseError, ResponseErrorCode, SIDE } from './service'
import Logger from './logger'
import { sleep,money } from './utils'
import { __DEV__, __PROD__, getRunEnv } from './env'
import { MINUTES, TICKER_TIME } from './constants'
// import Database from './database'


export let connect = createConnection().then(async connection => {

    console.log("Inserting a new user into the database...");
    let config = await loadConfig();
    let ddId = String(config.dingding.mobile);
    console.log(ddId);
    let userRepository = connection.getRepository(User);
    const userInfo = await userRepository.find({ where: { ddId: ddId } })
    console.log("Me and Bears photo from the db: ", userInfo);
    if (userInfo.length < 1) {
        const user = new User();
        user.ddId = "15810177358";
        await connection.manager.save(user);
        console.log("Saved a new user with id: " + user.id);
    }

    const service = new BinanceService()
    await service.init()

    // await Database.init(service)
    console.log("正式环境", __PROD__)

    __PROD__ && Logger.debug('正式环境:', await getRunEnv())

    let currentHours = new Date().getHours()

    while (true) {
        await (async () => {
            let scapedPrice = 0;
            try {
                const gridBuyPrice = service.coinConfig.grid_buy_price
                const gridSellPrice = service.coinConfig.grid_sell_price
                const quantity = service.coinConfig.quantity
                const step = service.coinConfig.step
                const currentQuantity = quantity[Math.min(step, quantity.length) - 1 >= 0 ? Math.min(step, quantity.length) - 1 : 0]
                const { price: currentMarketPrice } = await service.getTickerPrice(service.coinConfig.symbol)
                scapedPrice = currentMarketPrice
                if (!currentMarketPrice) {
                    throw new ResponseError('获取价格失败', ResponseErrorCode.ErrorTickerPrice)
                }

                if (__DEV__) {
                    Logger.debug(`${service.coinConfig.symbol}当前市价:`, currentMarketPrice)
                }
                // console.log(gridBuyPrice);
                // console.log(currentMarketPrice);
                if (gridBuyPrice >= currentMarketPrice) {
                    // 买单
                    const orderData = {
                        symbol: service.coinConfig.symbol,
                        quantity: currentQuantity,
                        price: gridBuyPrice
                    }
                    // console.log(orderData);
                    // console.log(gridBuyPrice);
                    // console.log(currentMarketPrice);
                    const { orderId } = await service.buyLimit(orderData)
                    await service.checkOrderStatusAndUpdateConfig(orderId, orderData, SIDE.BUY)
                } else if (gridSellPrice < currentMarketPrice) {
                    // 卖单
                    if (service.coinConfig.step === 0) {
                        return Logger.debug('当前仓位为0')
                    }
                    const orderData = {
                        symbol: service.coinConfig.symbol,
                        quantity: currentQuantity,
                        price: gridSellPrice
                    }
                    // console.log("卖",orderData)
                    const { orderId } = await service.sellLimit(orderData)
                    await service.checkOrderStatusAndUpdateConfig(orderId, orderData, SIDE.SELL)
                } else {
                    if (__DEV__) {
                        Logger.debug('价格不满足，继续下次策略循环')
                    }
                }
            } catch (error) {
                if (error instanceof ResponseError) {
                    switch (error.code) {
                        case ResponseErrorCode.InsufficientBalance:
                            Logger.error(`余额或可卖数量不足`, `当前${service.coinConfig.symbol}价格`, money(scapedPrice));
                            await sleep(5 * MINUTES)
                            break;
                        case ResponseErrorCode.ErrorTickerPrice:
                            Logger.error('获取价格失败, 延迟1分钟执行')
                            await sleep(MINUTES)
                            break;
                        default:
                            Logger.error(`code: ${error.code}; message: ${error.message}`)
                    }
                } else {
                    __DEV__ && console.error(error)
                    Logger.error(error.message)
                }
            }
        })()

        await sleep(TICKER_TIME)

        // 每小时推送交易信息
        const nowHours = new Date().getHours()
        if (nowHours !== currentHours) {
            service.statisticsOrders()
            service.statisticsAccount()
            currentHours = nowHours
        }
    }

}).catch(error => console.log(error));



