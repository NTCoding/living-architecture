import {
  describe, it, expect 
} from 'vitest'
import { ComponentIndex } from '../component-index'
import { buildCallGraph } from './build-call-graph'
import {
  sharedProject, nextFile, buildComponent, defaultOptions 
} from './call-graph-fixtures'

describe('buildCallGraph edge cases', () => {
  it('deduplicates to single link per source-target-type tuple', () => {
    const file = nextFile(`
class Repo {
  save(): void {}
  load(): void {}
}

class UseCase {
  private repo: Repo
  constructor(repo: Repo) { this.repo = repo }
  execute(): void {
    this.repo.save()
    this.repo.load()
  }
}
`)
    const compRepo = buildComponent('Repo', file, 2, { type: 'domainOp' })
    const compUC = buildComponent('UseCase', file, 7)
    const index = new ComponentIndex([compRepo, compUC])
    const result = buildCallGraph(sharedProject, [compRepo, compUC], index, defaultOptions())

    expect(result).toHaveLength(1)
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        source: 'orders:orders-module:useCase:usecase',
        target: 'orders:orders-module:domainOp:repo',
      }),
    )
  })

  it('uses lexically first call site for sourceLocation when multiple calls to same target', () => {
    const file = nextFile(`
class Store {
  get(): void {}
  put(): void {}
}

class Handler {
  private store: Store
  constructor(store: Store) { this.store = store }
  run(): void {
    this.store.put()
    this.store.get()
  }
}
`)
    const compStore = buildComponent('Store', file, 2, { type: 'domainOp' })
    const compHandler = buildComponent('Handler', file, 7)
    const index = new ComponentIndex([compStore, compHandler])
    const result = buildCallGraph(sharedProject, [compStore, compHandler], index, defaultOptions())

    expect(result).toHaveLength(1)
    expect(result[0]?.sourceLocation?.lineNumber).toBe(11)
  })

  it('uses source component call site for sourceLocation in transitive connections', () => {
    const file = nextFile(`
class Sink {
  drain(): void {}
}

class Middleware {
  private sink: Sink
  constructor(sink: Sink) { this.sink = sink }
  process(): void {
    this.sink.drain()
  }
}

class Entry {
  private mw: Middleware
  constructor(mw: Middleware) { this.mw = mw }
  execute(): void {
    this.mw.process()
  }
}
`)
    const compSink = buildComponent('Sink', file, 2, { type: 'domainOp' })
    const compEntry = buildComponent('Entry', file, 14)
    const index = new ComponentIndex([compSink, compEntry])
    const result = buildCallGraph(sharedProject, [compSink, compEntry], index, defaultOptions())

    expect(result).toHaveLength(1)
    expect(result[0]?.sourceLocation).toStrictEqual(
      expect.objectContaining({
        filePath: file,
        lineNumber: 18,
        methodName: 'execute',
      }),
    )
  })

  it('traces into getter methods', () => {
    const file = nextFile(`
class Dep {
  act(): void {}
}

class Wrapper {
  private _dep: Dep
  constructor(dep: Dep) { this._dep = dep }
  get dep(): Dep { return this._dep }
}

class Caller {
  private wrapper: Wrapper
  constructor(wrapper: Wrapper) { this.wrapper = wrapper }
  execute(): void {
    this.wrapper.dep.act()
  }
}
`)
    const compDep = buildComponent('Dep', file, 2, { type: 'domainOp' })
    const compCaller = buildComponent('Caller', file, 12)
    const index = new ComponentIndex([compDep, compCaller])
    const result = buildCallGraph(sharedProject, [compDep, compCaller], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:caller',
        target: 'orders:orders-module:domainOp:dep',
      }),
    ])
  })

  it('does not trace property access without getter', () => {
    const file = nextFile(`
class Data {
  value: string = 'hello'
}

class Reader {
  private data: Data
  constructor(data: Data) { this.data = data }
  execute(): string {
    return this.data.value
  }
}
`)
    const comp = buildComponent('Reader', file, 6)
    const index = new ComponentIndex([comp])
    const result = buildCallGraph(sharedProject, [comp], index, defaultOptions())
    expect(result).toStrictEqual([])
  })

  it('treats await as transparent', () => {
    const file = nextFile(`
class AsyncRepo {
  async save(): Promise<void> {}
}

class AsyncUseCase {
  private repo: AsyncRepo
  constructor(repo: AsyncRepo) { this.repo = repo }
  async execute(): Promise<void> {
    await this.repo.save()
  }
}
`)
    const compRepo = buildComponent('AsyncRepo', file, 2, { type: 'domainOp' })
    const compUC = buildComponent('AsyncUseCase', file, 6)
    const index = new ComponentIndex([compRepo, compUC])
    const result = buildCallGraph(sharedProject, [compRepo, compUC], index, defaultOptions())

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:orders-module:useCase:asyncusecase',
        target: 'orders:orders-module:domainOp:asyncrepo',
        type: 'sync',
      }),
    ])
  })

  it('handles branching: one non-component calling two different components', () => {
    const file = nextFile(`
class CompX {
  doX(): void {}
}

class CompY {
  doY(): void {}
}

class Router {
  private x: CompX
  private y: CompY
  constructor(x: CompX, y: CompY) { this.x = x; this.y = y }
  route(): void {
    this.x.doX()
    this.y.doY()
  }
}

class Start {
  private router: Router
  constructor(router: Router) { this.router = router }
  execute(): void {
    this.router.route()
  }
}
`)
    const compX = buildComponent('CompX', file, 2, { type: 'domainOp' })
    const compY = buildComponent('CompY', file, 6, { type: 'api' })
    const compStart = buildComponent('Start', file, 20)
    const index = new ComponentIndex([compX, compY, compStart])
    const result = buildCallGraph(sharedProject, [compX, compY, compStart], index, defaultOptions())

    const startToX = result.find(
      (l) =>
        l.source === 'orders:orders-module:useCase:start' &&
        l.target === 'orders:orders-module:domainOp:compx',
    )
    const startToY = result.find(
      (l) =>
        l.source === 'orders:orders-module:useCase:start' &&
        l.target === 'orders:orders-module:api:compy',
    )
    expect(startToX).toBeDefined()
    expect(startToY).toBeDefined()
    expect(result.filter((l) => l.source === 'orders:orders-module:useCase:start')).toHaveLength(2)
  })
})
