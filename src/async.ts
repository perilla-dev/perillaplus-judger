import util from 'util'
import stream from 'stream'

export const pipelineAsync = util.promisify(stream.pipeline)
