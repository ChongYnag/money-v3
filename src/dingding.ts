import { Config, loadConfig } from './load-config'
import { __DEV__, __PROD__ } from './env'
const fetch = require('node-fetch');

export default class DingDing {
    config!: Config;

    async loadConfig() {
        this.config = await loadConfig()
    }
    async init() {
        await this.loadConfig()
    }
    async sendMessage(text: string) {
        const headers = { 'Content-Type': 'application/json;charset=utf-8' }
        const message = {
            "msgtype": "text",
            "at": {
                "atMobiles": [
                    this.config.dingding.mobile
                ],
                "isAtAll": false
            },
            "text": {
                "content": text
            }
        }
        if (__PROD__) {
            try {
                // console.log(message)
                // console.log(this.config.dingding.token)
                await fetch('https://oapi.dingtalk.com/robot/send?access_token=' + this.config.dingding.token, {
                method: 'POST',
                headers,
                body: JSON.stringify(message)
            })
            } catch (e) {
                console.error(e)
                console.error('钉钉接口请求错误')
            }
            
        }
    }
}