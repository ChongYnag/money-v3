export const sleep = (time: number) => new Promise((resolve) => { setTimeout(resolve, time) })
export const money = (money: string | number) => parseFloat((+money).toFixed(3))
