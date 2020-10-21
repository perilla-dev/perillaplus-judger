import path from 'path'
import chalk from 'chalk'
import { createConnection } from 'typeorm'
import { API } from './api'
import { DIM_ENTITIES, DI_API, DI_DBCONN } from './constants'
import { inject, injectMutiple } from './di'
import { getConfig } from './entities'

const DATA_DIR = path.join(__dirname, '..', 'data')

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
}