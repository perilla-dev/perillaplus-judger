import fetch from 'node-fetch'
import { createWriteStream } from 'fs-extra'
import { pipelineAsync } from './async'

interface IRawFileDRO {
  id: string
  hash: string
}

interface IFileDTO {
  id: string
  path: string
  raw: IRawFileDRO
}

interface IProblemTypeDTO {
  id: string
  name: string
  desc: string
}

interface IProblemDTO {
  id: string
  data: string
  type: string
  updated: number
  files: IFileDTO[]
}

interface ISolutionDTO {
  id: string
  data: string
  type: string
  updated: number
  files: IFileDTO[]
}

interface IJudgerDTO {
  id: string
  name: string
  disp: string
}

export class API {
  private _base
  private _token

  constructor (base: string, token: string) {
    this._base = base
    this._token = token
  }

  async whoami () {
    const res: IJudgerDTO = await this.invoke('/whoami', {})
    return res
  }

  async listProblemTypes () {
    const res: IProblemTypeDTO[] = await this.invoke('/listproblemtypes', {})
    return res
  }

  async getProblem (problemId: string) {
    const problem: IProblemDTO = await this.invoke('/getproblem', { problemId })
    return problem
  }

  async getSolution (solutionId: string) {
    const solution: ISolutionDTO = await this.invoke('/getsolution', { solutionId })
    return solution
  }

  async popSolution (typeId: string) {
    const id: string = await this.invoke('/popsolution', { typeId })
    return id
  }

  async invoke (path: string, body: any) {
    const url = this._base + '/api/judger/judger' + path
    const res = await fetch(url, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': this._token
      }
    })
    const data = await res.json()
    if (data.ok) {
      return data.result
    } else {
      throw new Error(data.result)
    }
  }

  async download (rawId: string, dst: string) {
    const url = this._base + '/file/raw?rawId=' + rawId
    const res = await fetch(url, {
      method: 'get',
      headers: {
        'x-access-token': this._token
      }
    })
    if (!res.ok) throw new Error(res.statusText)
    await pipelineAsync(res.body, createWriteStream(dst))
    return res.headers.get('x-file-hash')!
  }
}
