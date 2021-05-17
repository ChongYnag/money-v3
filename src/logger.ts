// import chalkin from "https://deno.land/x/chalkin/mod.ts\"

const chalkin = require('chalk');
import DingDing from './dingding'
import { __DEV__ , __PROD__} from './env'

const dingding = new DingDing()
dingding.init()
class Logger {
    static encodeObject(...text: any[]) {
        return text.map(it => {
            if (typeof it === 'object' && it !== null) {
                return JSON.stringify(it, null, 2)
            }
            return it
        })
    }

    static _baseLogger = function (...text: any[]) {
        console.log(`${chalkin.grey(Date.now())}:`, ...text)
    }

    static debug = function (...text: any[]) {
        text = Logger.encodeObject(text)
        // 生产环境不发送debug日志
        !__PROD__ && dingding.sendMessage('[debug]:' + text[0])
        return Logger._baseLogger(chalkin.gray('[debug]', ...text))
    }

    static info = function (...text: any[]) {
        text = Logger.encodeObject(text)
        dingding.sendMessage('[info]:' + text[0])
        return Logger._baseLogger(chalkin.greenBright('[info]', ...text))
    }

    static warn = function (...text: any[]) {
        text = Logger.encodeObject(text)
        dingding.sendMessage('[warn]:' + text[0])
        return Logger._baseLogger(chalkin.yellowBright('[warn]', ...text))
    }

    static error = function (...text: any[]) {
        text = Logger.encodeObject(text)
        dingding.sendMessage('[error]:' + text[0])
        return Logger._baseLogger(chalkin.redBright(...text))
    }
}

export default Logger
