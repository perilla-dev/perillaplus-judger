import fetch from 'node-fetch'
import { copy, createWriteStream, emptyDir, ensureDir, ensureDirSync, move } from 'fs-extra'
import { pipelineAsync } from './async'
import path from 'path'
import { file as tmpFile } from 'tmp-promise'
import { UUIDToPath } from './misc'
import { getManager } from 'typeorm'
import { RawFile } from './entities'

export enum SolutionState {
  Queued,
  Running,
  Done
}

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
  problemId: string
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
  private _root

  constructor (base: string, token: string) {
    this._base = base
    this._token = token
    this._root = path.resolve(__dirname, '..', 'data', 'managed')
    ensureDirSync(this._root)
  }

  async syncFile (rawId: string) {
    const tmp = await tmpFile()
    const hash = await this.download(rawId, tmp.path)
    const dst = path.join(this._root, 'files', UUIDToPath(rawId))
    await move(tmp.path, dst, { overwrite: true })
    await tmp.cleanup()
    const m = getManager()
    if (!await m.count(RawFile, { id: rawId })) {
      const raw = new RawFile()
      raw.id = rawId
      raw.hash = hash
      await m.save(raw)
    }
    return dst
  }

  async syncProblem (problemId: string) {
    const problem = await this.getProblem(problemId)
    const dst = path.join(this._root, 'problems', UUIDToPath(problemId))
    await ensureDir(dst)
    for (const file of problem.files) {
      const src = await this.syncFile(file.raw.id)
      await copy(src, path.join(dst, file.path))
    }
    return problem
  }

  async syncSolution (solutionId: string, dst: string) {
    const solution = await this.getSolution(solutionId)
    await ensureDir(dst)
    await emptyDir(dst)
    for (const file of solution.files) {
      const src = await this.syncFile(file.raw.id)
      await copy(src, path.join(dst, file.path))
    }
    return solution
  }

  // Prepare solution for judger handler
  // Returns: [problemData, problemDir, solutionData, solutionDir]
  async prepareSolution (solutionId: string, solutionDir: string) {
    const solution = await this.syncSolution(solutionId, solutionDir)
    const solutionData = JSON.parse(solution.data)
    const problem = await this.syncProblem(solution.problemId)
    const problemData = JSON.parse(problem.data)
    const problemDir = path.join(this._root, 'problems', UUIDToPath(solution.problemId))
    return { problem, solution, params: { problemData, problemDir, solutionData, solutionDir } }
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

  async updateSolution (solutionId: string, state?: SolutionState, status?: string, details?: string) {
    await this.invoke('/updatesolution', { solutionId, state, status, details })
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
