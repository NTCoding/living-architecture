import {
  describe, it, expect 
} from 'vitest'
import type { Project } from 'ts-morph'
import type { ConnectionPattern } from '@living-architecture/riviere-extract-config'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type { ExtractedLink } from '../extracted-link'
import { buildComponent } from '../call-graph/call-graph-fixtures'
import { ComponentIndex } from '../component-index'
import { createProject } from '../detect-connections-fixtures'
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

function syncPattern(overrides: Partial<ConnectionPattern> = {}): ConnectionPattern {
  return {
    name: 'use-case-to-repo',
    find: 'methodCalls',
    where: { methodName: 'save' },
    linkType: 'sync',
    ...overrides,
  }
}

describe('detectConfigurableConnections', () => {
  it('returns empty array when patterns array is empty', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/a.ts',
      `
class Repo { save(): void {} }
class Caller {
  constructor(private repo: Repo) {}
  execute(): void { this.repo.save() }
}
`,
    )
    const caller = buildComponent('Caller', '/src/a.ts', 3)

    const result = detectConfigurableConnections(project, [], [caller], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })

  it('produces one link when single pattern matches one call site', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/b.ts',
      `
class EventBus {
  publish(): void {}
}
class OrderService {
  constructor(private bus: EventBus) {}
  execute(): void { this.bus.publish() }
}
`,
    )
    const caller = buildComponent('OrderService', '/src/b.ts', 5)
    const target = buildComponent('EventBus', '/src/b.ts', 2, { type: 'event' })
    const pattern = syncPattern({
      name: 'publish-call',
      where: {
        methodName: 'publish',
        receiverType: 'EventBus',
      },
    })

    const result = detectConfigurableConnections(project, [pattern], [caller, target], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        source: 'orders:useCase:OrderService',
        target: 'orders:event:EventBus',
        type: 'sync',
      }),
    )
  })

  it('produces no links when single pattern matches no call sites', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/c.ts',
      `
class OrderService {
  execute(): void {}
}
`,
    )
    const caller = buildComponent('OrderService', '/src/c.ts', 2)
    const pattern = syncPattern({ where: { methodName: 'publish' } })

    const result = detectConfigurableConnections(project, [pattern], [caller], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })

  it('includes links from multiple patterns', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/d.ts',
      `
class EventBus { publish(): void {} }
class Repository { save(): void {} }
class OrderService {
  constructor(private bus: EventBus, private repo: Repository) {}
  execute(): void {
    this.bus.publish()
    this.repo.save()
  }
}
`,
    )
    const caller = buildComponent('OrderService', '/src/d.ts', 4)
    const bus = buildComponent('EventBus', '/src/d.ts', 2, { type: 'event' })
    const repo = buildComponent('Repository', '/src/d.ts', 3, { type: 'domainOp' })
    const publishPattern = syncPattern({
      name: 'publish-call',
      where: { methodName: 'publish' },
    })
    const savePattern = syncPattern({
      name: 'save-call',
      where: { methodName: 'save' },
    })

    const result = detectConfigurableConnections(
      project,
      [publishPattern, savePattern],
      [caller, bus, repo],
      {
        strict: true,
        repository: 'test-repo',
      },
    )

    expect(result).toHaveLength(2)
    expect(result).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'orders:useCase:OrderService',
          target: 'orders:event:EventBus',
        }),
        expect.objectContaining({
          source: 'orders:useCase:OrderService',
          target: 'orders:domainOp:Repository',
        }),
      ]),
    )
  })

  it('produces one link per pattern when same call site matches two patterns', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/e.ts',
      `
class EventBus { publish(): void {} }
class OrderService {
  constructor(private bus: EventBus) {}
  execute(): void { this.bus.publish() }
}
`,
    )
    const caller = buildComponent('OrderService', '/src/e.ts', 3)
    const bus = buildComponent('EventBus', '/src/e.ts', 2, { type: 'event' })
    const pattern1 = syncPattern({
      name: 'by-method',
      where: { methodName: 'publish' },
    })
    const pattern2 = syncPattern({
      name: 'by-receiver',
      where: { receiverType: 'EventBus' },
      linkType: 'async',
    })

    const result = detectConfigurableConnections(project, [pattern1, pattern2], [caller, bus], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(2)
    const types = result.map((l) => l.type)
    expect(types).toContain('sync')
    expect(types).toContain('async')
  })

  it('includes correct sourceLocation with file, line, and method', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/f.ts',
      `
class EventBus { publish(): void {} }
class OrderService {
  constructor(private bus: EventBus) {}
  execute(): void {
    this.bus.publish()
  }
}
`,
    )
    const caller = buildComponent('OrderService', '/src/f.ts', 3)
    const bus = buildComponent('EventBus', '/src/f.ts', 2, { type: 'event' })
    const pattern = syncPattern({
      name: 'publish-call',
      where: { methodName: 'publish' },
    })

    const result = detectConfigurableConnections(project, [pattern], [caller, bus], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        sourceLocation: expect.objectContaining({
          repository: 'test-repo',
          filePath: '/src/f.ts',
          lineNumber: 6,
          methodName: 'execute',
        }),
      }),
    )
  })

  it('sets linkType sync or async from the pattern', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/g.ts',
      `
class EventBus { publish(): void {} }
class OrderService {
  constructor(private bus: EventBus) {}
  execute(): void { this.bus.publish() }
}
`,
    )
    const caller = buildComponent('OrderService', '/src/g.ts', 3)
    const bus = buildComponent('EventBus', '/src/g.ts', 2, { type: 'event' })
    const asyncPattern = syncPattern({
      name: 'async-publish',
      where: { methodName: 'publish' },
      linkType: 'async',
    })

    const result = detectConfigurableConnections(project, [asyncPattern], [caller, bus], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toStrictEqual(expect.objectContaining({ type: 'async' }))
  })

  it('deduplicates when two patterns produce identical source-target-type tuple', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/h.ts',
      `
class EventBus { publish(): void {} }
class OrderService {
  constructor(private bus: EventBus) {}
  execute(): void { this.bus.publish() }
}
`,
    )
    const caller = buildComponent('OrderService', '/src/h.ts', 3)
    const bus = buildComponent('EventBus', '/src/h.ts', 2, { type: 'event' })
    const pattern1 = syncPattern({
      name: 'by-method',
      where: { methodName: 'publish' },
      linkType: 'sync',
    })
    const pattern2 = syncPattern({
      name: 'by-receiver',
      where: { receiverType: 'EventBus' },
      linkType: 'sync',
    })

    const result = detectConfigurableConnections(project, [pattern1, pattern2], [caller, bus], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toStrictEqual(
      expect.objectContaining({
        source: 'orders:useCase:OrderService',
        target: 'orders:event:EventBus',
        type: 'sync',
      }),
    )
  })

  it('skips call expressions without property access receiver', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/i.ts',
      `
function freeFunction(): void {}
class Caller {
  execute(): void { freeFunction() }
}
`,
    )
    const caller = buildComponent('Caller', '/src/i.ts', 3)
    const pattern = syncPattern({ where: { methodName: 'freeFunction' } })

    const result = detectConfigurableConnections(project, [pattern], [caller], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })

  it('skips call site when receiver type is not a known component', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/j.ts',
      `
class NonComponent { doWork(): void {} }
class Caller {
  constructor(private dep: NonComponent) {}
  execute(): void { this.dep.doWork() }
}
`,
    )
    const caller = buildComponent('Caller', '/src/j.ts', 3)
    const pattern = syncPattern({ where: { methodName: 'doWork' } })

    const result = detectConfigurableConnections(project, [pattern], [caller], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })

  it('skips components without a class in the project', () => {
    const project = createProject()
    project.createSourceFile('/src/m.ts', '')
    const missingComponent = buildComponent('NonExistent', '/src/m.ts', 1)
    const pattern = syncPattern({ where: { methodName: 'anything' } })

    const result = detectConfigurableConnections(project, [pattern], [missingComponent], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })

  it('skips call site when receiver type is unresolvable', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/n.ts',
      `
class UnresolvableCaller {
  constructor(private dep: any) {}
  execute(): void { this.dep.doWork() }
}
`,
    )
    const caller = buildComponent('UnresolvableCaller', '/src/n.ts', 2)
    const pattern = syncPattern({ where: { methodName: 'doWork' } })

    const result = detectConfigurableConnections(project, [pattern], [caller], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([])
  })
})
