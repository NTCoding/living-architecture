import {
  describe, it, expect 
} from 'vitest'
import {
  Project, ScriptTarget, ModuleKind 
} from 'ts-morph'
import { detectConnections } from './detect-connections'
import { buildComponent } from './call-graph/call-graph-fixtures'
import { matchesGlob } from '../../platform/infra/glob-matching/minimatch-glob'

function createProject(): Project {
  return new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      strict: true,
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
    },
  })
}

describe('detectConnections', () => {
  it('returns empty links for empty components array', () => {
    const project = createProject()
    project.createSourceFile('/src/empty.ts', '')

    const result = detectConnections(project, [], { moduleGlobs: ['/src/**/*.ts'] }, matchesGlob)

    expect(result).toStrictEqual([])
  })

  it('returns sync link for UseCase to Repository direct call', () => {
    const project = createProject()
    const filePath = '/src/place-order.ts'
    project.createSourceFile(
      filePath,
      `
class OrderRepository {
  save(): void {}
}

class PlaceOrder {
  private repo: OrderRepository
  constructor(repo: OrderRepository) { this.repo = repo }
  execute(): void {
    this.repo.save()
  }
}
`,
    )
    const repo = buildComponent('OrderRepository', filePath, 2, { type: 'repository' })
    const useCase = buildComponent('PlaceOrder', filePath, 6)

    const result = detectConnections(
      project,
      [repo, useCase],
      { moduleGlobs: ['/src/**/*.ts'] },
      matchesGlob,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:useCase:PlaceOrder',
        target: 'orders:repository:OrderRepository',
        type: 'sync',
      }),
    ])
  })

  it('returns transitive link through non-component intermediary', () => {
    const project = createProject()
    const filePath = '/src/transitive.ts'
    project.createSourceFile(
      filePath,
      `
class EventStore {
  append(): void {}
}

class EventBus {
  private store: EventStore
  constructor(store: EventStore) { this.store = store }
  publish(): void {
    this.store.append()
  }
}

class PublishEvent {
  private bus: EventBus
  constructor(bus: EventBus) { this.bus = bus }
  execute(): void {
    this.bus.publish()
  }
}
`,
    )
    const store = buildComponent('EventStore', filePath, 2, { type: 'repository' })
    const useCase = buildComponent('PublishEvent', filePath, 14)

    const result = detectConnections(
      project,
      [store, useCase],
      { moduleGlobs: ['/src/**/*.ts'] },
      matchesGlob,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:useCase:PublishEvent',
        target: 'orders:repository:EventStore',
      }),
    ])
  })

  it('uses strict mode by default when allowIncomplete is undefined', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/strict.ts',
      `
class StrictComp {
  execute(): void {}
}
`,
    )
    const comp = buildComponent('StrictComp', '/src/strict.ts', 2)

    const result = detectConnections(
      project,
      [comp],
      { moduleGlobs: ['/src/**/*.ts'] },
      matchesGlob,
    )

    expect(result).toStrictEqual([])
  })

  it('respects allowIncomplete option for lenient mode', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/lenient.ts',
      `
class LenientComp {
  execute(): void {}
}
`,
    )
    const comp = buildComponent('LenientComp', '/src/lenient.ts', 2)

    const result = detectConnections(
      project,
      [comp],
      {
        allowIncomplete: true,
        moduleGlobs: ['/src/**/*.ts'],
      },
      matchesGlob,
    )

    expect(result).toStrictEqual([])
  })

  it('handles circular dependencies without infinite loop', () => {
    const project = createProject()
    const filePath = '/src/circular.ts'
    project.createSourceFile(
      filePath,
      `
class ServiceB {
  private a!: ServiceA
  ping(): void { this.a.pong() }
}

class ServiceA {
  private b: ServiceB
  constructor(b: ServiceB) { this.b = b }
  pong(): void { this.b.ping() }
}
`,
    )
    const compA = buildComponent('ServiceA', filePath, 7)
    const compB = buildComponent('ServiceB', filePath, 2, { type: 'domainOp' })

    const result = detectConnections(
      project,
      [compA, compB],
      { moduleGlobs: ['/src/**/*.ts'] },
      matchesGlob,
    )

    const aToB = result.find(
      (l) => l.source === 'orders:useCase:ServiceA' && l.target === 'orders:domainOp:ServiceB',
    )
    const bToA = result.find(
      (l) => l.source === 'orders:domainOp:ServiceB' && l.target === 'orders:useCase:ServiceA',
    )
    expect(aToB).toBeDefined()
    expect(bToA).toBeDefined()
    expect(result).toHaveLength(2)
  })

  it('filters source files by moduleGlobs', () => {
    const project = createProject()
    const includedFile = '/src/modules/ordering/handler.ts'
    const excludedFile = '/src/modules/billing/helper.ts'

    project.createSourceFile(
      includedFile,
      `
class PaymentGateway {
  charge(): void {}
}

class ProcessPayment {
  private gateway: PaymentGateway
  constructor(gateway: PaymentGateway) { this.gateway = gateway }
  execute(): void {
    this.gateway.charge()
  }
}
`,
    )
    project.createSourceFile(
      excludedFile,
      `
class BillingHelper {
  private gateway: PaymentGateway
  constructor(gateway: PaymentGateway) { this.gateway = gateway }
  assist(): void {
    this.gateway.charge()
  }
}

class PaymentGateway {
  charge(): void {}
}
`,
    )

    const gateway = buildComponent('PaymentGateway', includedFile, 2, { type: 'repository' })
    const processPayment = buildComponent('ProcessPayment', includedFile, 6)

    const result = detectConnections(
      project,
      [gateway, processPayment],
      { moduleGlobs: ['/src/modules/ordering/**/*.ts'] },
      matchesGlob,
    )

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:useCase:ProcessPayment',
        target: 'orders:repository:PaymentGateway',
      }),
    ])
    expect(project.getSourceFiles().map((f) => f.getFilePath())).toStrictEqual([
      includedFile,
      excludedFile,
    ])
  })
})
