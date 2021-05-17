// import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts"
const crypto = require('crypto');

// export function sign(qs: string, key: string) {
//    return crypto.createHmac("sha256", key, qs, "utf8", "hex")
// }

export function sign(str: string, key: string) {
   return crypto.createHmac('sha256', key)
      .update(str, 'utf8')
      .digest('hex');
}
