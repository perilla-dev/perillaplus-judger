import prompts from 'prompts'
import { Column, Entity, getManager, PrimaryColumn } from 'typeorm'
import { DIM_ENTITIES } from './constants'
import { injectMutiple } from './di'

@Entity()
export class Config {
  @PrimaryColumn()
  key!: string

  @Column()
  value!: string
}

@Entity()
export class RawFile {
  @PrimaryColumn()
  id!: string

  @Column()
  hash!: string
}

@Entity()
export class Problem {
  @PrimaryColumn()
  id!: string
}

injectMutiple(DIM_ENTITIES).provide(Config).provide(RawFile).provide(Problem)

export async function getConfig (key: string, init?: string) {
  const m = getManager()
  if (init !== undefined) {
    const cfg = await m.findOne(Config, key)
    if (cfg) {
      return cfg.value
    } else {
      await setConfig(key, init)
      return init
    }
  } else {
    const cfg = await m.findOne(Config, key)
    if (cfg) {
      return cfg.value
    } else {
      const init = await prompts({
        type: 'text',
        message: key,
        name: 'value'
      }).then(r => r.value)
      await setConfig(key, init)
      return init
    }
  }
}

export async function setConfig (key: string, value: string) {
  const m = getManager()
  let cfg = await m.findOne(Config, key)
  if (!cfg) {
    cfg = new Config()
    cfg.key = key
  }
  cfg.value = value
  await m.save(cfg)
}
