import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
    UpdateDateColumn,
} from "typeorm";

enum OrderStatus {
    'FILLED' = 'FILLED',
    'NEW' = 'NEW',
}
 enum SIDE {
    BUY = 'BUY',
    SELL = 'SELL'
}
@Entity()
export class Order {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    ddId: string;
    
    @Column()
    symbol: string;

    @Column()
    orderId: number;

    @Column()
    orderListId: number;

    @Column()
    clientOrderId: string;

    @Column()
    price: string;

    @Column()
    origQty: string;

    @Column()
    executedQty: string;

    @Column()
    cummulativeQuoteQty: string;

    @Column()
    status: OrderStatus;

    @Column()
    timeInForce: string;

    @Column()
    type: string;

    @Column()
    side: SIDE;

    @Column()
    stopPrice: string;

    @Column()
    icebergQty: string;

    @Column()
    time: string;

    @Column()
    isWorking: boolean;

    @Column()
    origQuoteOrderQty: string;

    @CreateDateColumn()
    createdTime: string;

    @UpdateDateColumn()
    updateTime: string;
}
