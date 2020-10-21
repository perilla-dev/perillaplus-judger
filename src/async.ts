import util from 'util'
import stream from 'stream'

export const pipelineAsync = util.promisify(stream.pipeline)
export const wait = (ms: number) => new Promise<void>(resolve => setTimeout(() => resolve(), ms))
