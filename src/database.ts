import Logger from './logger.ts'
import { OrderDetail, Service } from "./service.ts"
import { Client } from "https://deno.land/x/mysql/mod.ts"
import { sleep } from './utils.ts'

export default class Database {
    private static client: Client;
    private static service: Service;
    private static DATABASE_NAME: string;
    private static TABLE_TRADE_NAME = 'orders';

    static async init(service: Service) {
        Database.service = service
        Database.client = await new Client().connect({
            hostname: "127.0.0.1",
            username: "root",
            password: "Flzx-3qc",
        })

        Logger.debug('数据库连接成功')

        Database.DATABASE_NAME = `data_${Database.service.config.dingding.mobile}`

        Database.client.execute(`CREATE DATABASE IF NOT EXISTS ${Database.DATABASE_NAME}`)
        await Database.client.execute(`USE ${Database.DATABASE_NAME}`)
        // await Database.client.execute(`DROP TABLE IF EXISTS ${Database.TABLE_TRADE_NAME}`);
        await Database.client.execute(`
            CREATE TABLE IF NOT EXISTS ${Database.TABLE_TRADE_NAME} (
                id int(11) NOT NULL AUTO_INCREMENT,
                symbol varchar(64),
                orderId bigint,
                orderListId int,
                clientOrderId varchar(64),
                price varchar(64),
                origQty varchar(64),
                executedQty varchar(64),
                cummulativeQuoteQty varchar(64),
                status varchar(64),
                timeInForce varchar(64),
                type varchar(64),
                side varchar(64),
                stopPrice varchar(64),
                icebergQty varchar(64),
                time bigint,
                updateTime bigint,
                isWorking int,
                origQuoteOrderQty varchar(64),
                created_at timestamp not null default current_timestamp,
                PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
        `)
    }

    static async insert(data: OrderDetail) {
        Logger.debug('插入数据成功', data)
        await Database.client.execute(`INSERT INTO ${Database.TABLE_TRADE_NAME}(
            symbol,
            orderId,
            orderListId,
            clientOrderId,
            price,
            origQty,
            executedQty,
            cummulativeQuoteQty,
            status,
            timeInForce,
            type,
            side,
            stopPrice,
            icebergQty,
            time,
            updateTime,
            isWorking,
            origQuoteOrderQty
        ) values(
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
        )`, [
            data.symbol,
            data.orderId,
            data.orderListId,
            data.clientOrderId,
            data.price,
            data.origQty,
            data.executedQty,
            data.cummulativeQuoteQty,
            data.status,
            data.timeInForce,
            data.type,
            data.side,
            data.stopPrice,
            data.icebergQty,
            data.time,
            data.updateTime,
            data.isWorking,
            data.origQuoteOrderQty
        ])
    }

    static async selectAll(): Promise<OrderDetail[]> {
        await sleep(0)
        return await Database.client.query(`select * from ${Database.TABLE_TRADE_NAME}`)
    }
}
