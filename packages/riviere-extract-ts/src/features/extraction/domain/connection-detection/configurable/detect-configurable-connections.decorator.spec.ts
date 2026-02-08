import {
  describe, it, expect 
} from 'vitest'
import type { Project } from 'ts-morph'
import type { ConnectionPattern } from '@living-architecture/riviere-extract-config'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type { ExtractedLink } from '../extracted-link'
import { buildComponent } from '../call-graph/call-graph-fixtures'
import { ComponentIndex } from '../component-index'
import { createTestProject } from './configurable-fixtures'
import { detectConfigurableConnections as detectConfigurableConnectionsImpl } from './detect-configurable-connections'

function detectConfigurableConnections(
  project: Project,
  patterns: ConnectionPattern[],
  components: readonly EnrichedComponent[],
  options: {
    strict: boolean
    repository: string
  },
): ExtractedLink[] {
  return detectConfigurableConnectionsImpl(
    project,
    patterns,
    components,
    new ComponentIndex(components),
    options,
  )
}

function createProject() {
  return createTestProject({ experimentalDecorators: true })
}

function syncPattern(overrides: Partial<ConnectionPattern> = {}): ConnectionPattern {
  return {
    name: 'use-case-to-repo',
    find: 'methodCalls',
    where: { methodName: 'save' },
    linkType: 'sync',
    ...overrides,
  }
}

describe('detectConfigurableConnections decorator matching', () => {
  it('matches pattern with callerHasDecorator where clause', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/k.ts',
      `
function Controller(path: string) { return (target: any) => target }
class EventBus { publish(): void {} }
@Controller('/orders')
class OrdersController {
  constructor(private bus: EventBus) {}
  handle(): void { this.bus.publish() }
}
`,
    )
    const caller = buildComponent('OrdersController', '/src/k.ts', 4)
    const bus = buildComponent('EventBus', '/src/k.ts', 3, { type: 'event' })
    const pattern = syncPattern({
      name: 'controller-publish',
      where: {
        methodName: 'publish',
        callerHasDecorator: ['Controller'],
      },
    })

    const result = detectConfigurableConnections(project, [pattern], [caller, bus], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        source: 'orders:useCase:OrdersController',
        target: 'orders:event:EventBus',
      }),
    )
  })

  it('rejects match when callerHasDecorator is specified but caller lacks decorator', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/l.ts',
      `
class EventBus { publish(): void {} }
class PlainService {
  constructor(private bus: EventBus) {}
  handle(): void { this.bus.publish() }
}
`,
    )
    const caller = buildComponent('PlainService', '/src/l.ts', 3)
    const bus = buildComponent('EventBus', '/src/l.ts', 2, { type: 'event' })
    const pattern = syncPattern({
      name: 'controller-only',
      where: {
        methodName: 'publish',
        callerHasDecorator: ['Controller'],
      },
    })

    const result = detectConfigurableConnections(project, [pattern], [caller, bus], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })

  it('matches pattern with calleeType.hasDecorator where clause', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/o.ts',
      `
function Injectable(scope: string) { return (target: any) => target }
@Injectable('singleton')
class OrderRepository {
  save(): void {}
}
class OrderService {
  constructor(private repo: OrderRepository) {}
  execute(): void { this.repo.save() }
}
`,
    )
    const caller = buildComponent('OrderService', '/src/o.ts', 7)
    const repo = buildComponent('OrderRepository', '/src/o.ts', 3, { type: 'domainOp' })
    const pattern = syncPattern({
      name: 'injectable-callee',
      where: {
        methodName: 'save',
        calleeType: { hasDecorator: 'Injectable' },
      },
    })

    const result = detectConfigurableConnections(project, [pattern], [caller, repo], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        source: 'orders:useCase:OrderService',
        target: 'orders:domainOp:OrderRepository',
      }),
    )
  })

  it('rejects match when calleeType.hasDecorator is specified but callee lacks decorator', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/p.ts',
      `
class PlainRepo {
  save(): void {}
}
class CallerService {
  constructor(private repo: PlainRepo) {}
  execute(): void { this.repo.save() }
}
`,
    )
    const caller = buildComponent('CallerService', '/src/p.ts', 5)
    const repo = buildComponent('PlainRepo', '/src/p.ts', 2, { type: 'domainOp' })
    const pattern = syncPattern({
      name: 'injectable-only',
      where: {
        methodName: 'save',
        calleeType: { hasDecorator: 'Injectable' },
      },
    })

    const result = detectConfigurableConnections(project, [pattern], [caller, repo], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })
})
