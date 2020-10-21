import chalk from 'chalk'

class SingleInject<T> {
  name
  value?: T

  constructor (name: string) {
    this.name = name
  }

  provide (value: T) {
    if (this.value) console.log(chalk.yellow(`[WARN] Mutiple provide for single inject ${this.name}`))
    this.value = value
    return this
  }

  get () {
    if (this.value) return this.value
    throw new Error('Value not provided!')
  }

  static all = new Map<symbol, SingleInject<any>>()
}

class MutipleInject<T> {
  name
  values

  constructor (name: string) {
    this.name = name
    this.values = <T[]>[]
  }

  provide (value: T) {
    this.values.push(value)
    return this
  }

  get () {
    return this.values
  }

  static all = new Map<symbol, MutipleInject<any>>()
}

export function inject<T> (name: symbol): SingleInject<T> {
  if (SingleInject.all.has(name)) return SingleInject.all.get(name)!
  // @ts-ignore
  const si = new SingleInject<T>(name.description)
  SingleInject.all.set(name, si)
  return si
}

export function injectMutiple<T> (name: symbol): MutipleInject<T> {
  if (MutipleInject.all.has(name)) return MutipleInject.all.get(name)!
  // @ts-ignore
  const mi = new MutipleInject<T>(name.description)
  MutipleInject.all.set(name, mi)
  return mi
}
