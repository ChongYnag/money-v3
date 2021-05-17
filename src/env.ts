export const __DEV__ = process.env.RUN_ENV === 'development'
export const __PROD__ = process.env.RUN_ENV  === 'production'

export async function getRunEnv() {
    return "go"
}

// export async function getRunEnv() {
//     const p = Deno.run({ cmd: ['deno', '--version'], stdout: 'piped' })
//     const output = await p.output()
//     p.close()

//     return Uint8ArrayToString(output).split('\n')[0]
// }

// function Uint8ArrayToString(fileData: Uint8Array) {
//     var dataString = "";
//     for (let i = 0; i < fileData.length; i++) {
//         dataString += String.fromCharCode(fileData[i]);
//     }

//     return dataString
// }