import path from 'path'
import chalk from 'chalk'
import { createConnection } from 'typeorm'
import { API, SolutionState } from './api'
import { DIM_ENTITIES, DI_API, DI_DBCONN } from './constants'
import { inject, injectMutiple } from './di'
import { getConfig } from './entities'
import { wait } from './async'
import { dir as tmpDir } from 'tmp-promise'
import { emptyDir } from 'fs-extra'

const DATA_DIR = path.join(__dirname, '..', 'data')

interface IJudgerHandlerParams{
  problemData: any
  problemDir: string
  solutionData: any
  solutionDir: string
}

async function * noop (params: IJudgerHandlerParams) {
  console.log(params)
  yield { status: 'AC', details: '' }
}

export async function main () {
  const conn = await createConnection({
    type: 'sqlite',
    database: path.join(DATA_DIR, 'main.db'),
    entities: injectMutiple<any>(DIM_ENTITIES).get(),
    synchronize: true
  })
  inject(DI_DBCONN).provide(conn)

  const api = new API(
    await getConfig('api-base', 'http://localhost:3000'),
    await getConfig('api-token')
  )
  inject(DI_API).provide(api)

  const me = await api.whoami()
  console.log(chalk.blue('Logged in as:'), chalk.blueBright(me.disp))

  const types = await api.listProblemTypes()
  console.log('Server problem types:', types.map(x => x.name).join(','))
  while (true) {
    for (const type of types) {
      if (type.name === 'noop') {
        const solutionId = await api.popSolution(type.id)
        if (solutionId) {
          console.log('Get task:', solutionId)
          const tmp = await tmpDir()
          const res = await api.prepareSolution(solutionId, tmp.path)
          try {
            await api.updateSolution(res.solution.id, SolutionState.Running, 'Prepared', '{}')
            for await (const result of noop(res.params)) {
              await api.updateSolution(res.solution.id, undefined, result.status, result.details)
            }
            await api.updateSolution(res.solution.id, SolutionState.Done)
          } catch (e) {
            await api.updateSolution(res.solution.id, SolutionState.Done, 'Failed', e.message)
          }
          await emptyDir(tmp.path)
          await tmp.cleanup()
        } else {
          await wait(500)
        }
      }
    }
  }
}
