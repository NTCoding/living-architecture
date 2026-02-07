import {
  describe, it, expect 
} from 'vitest'
import {
  Project, ScriptTarget, ModuleKind 
} from 'ts-morph'
import type { ConnectionPattern } from '@living-architecture/riviere-extract-config'
import { buildComponent } from '../call-graph/call-graph-fixtures'
import { ConnectionDetectionError } from '../connection-detection-error'
import { detectConfigurableConnections } from './detect-configurable-connections'

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

function syncPattern(overrides: Partial<ConnectionPattern> = {}): ConnectionPattern {
  return {
    name: 'use-case-to-repo',
    find: 'methodCalls',
    where: { methodName: 'save' },
    linkType: 'sync',
    ...overrides,
  }
}

describe('detectConfigurableConnections - strict/lenient mode', () => {
  it('throws ConnectionDetectionError in strict mode when extract rule returns undefined', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/strict-extract.ts',
      `
class EventBus {
  publish(): void {}
}
class StrictCaller {
  constructor(private bus: EventBus) {}
  execute(): void { this.bus.publish() }
}
`,
    )
    const caller = buildComponent('StrictCaller', '/src/strict-extract.ts', 5)
    const bus = buildComponent('EventBus', '/src/strict-extract.ts', 2, { type: 'event' })
    const pattern = syncPattern({
      name: 'extract-arg-strict',
      where: { methodName: 'publish' },
      extract: { eventName: { fromArgument: 0 } },
    })

    expect(() =>
      detectConfigurableConnections(project, [pattern], [caller, bus], { strict: true }),
    ).toThrow(ConnectionDetectionError)
  })

  it('produces link with _uncertain field in lenient mode when extract rule returns undefined', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/lenient-extract.ts',
      `
class EventBus {
  publish(): void {}
}
class LenientCaller {
  constructor(private bus: EventBus) {}
  execute(): void { this.bus.publish() }
}
`,
    )
    const caller = buildComponent('LenientCaller', '/src/lenient-extract.ts', 5)
    const bus = buildComponent('EventBus', '/src/lenient-extract.ts', 2, { type: 'event' })
    const pattern = syncPattern({
      name: 'extract-arg-lenient',
      where: { methodName: 'publish' },
      extract: { eventName: { fromArgument: 0 } },
    })

    const result = detectConfigurableConnections(project, [pattern], [caller, bus], {strict: false,})

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:useCase:LenientCaller',
        target: 'orders:event:EventBus',
        type: 'sync',
        _uncertain: expect.stringContaining('eventName'),
      }),
    ])
  })

  it('produces normal link when extract rules all resolve successfully', () => {
    const project = createProject()
    project.createSourceFile(
      '/src/extract-success.ts',
      `
class OrderPlacedEvent {}
class EventBus {
  publish(event: OrderPlacedEvent): void {}
}
class ExtractCaller {
  constructor(private bus: EventBus) {}
  execute(): void { this.bus.publish(new OrderPlacedEvent()) }
}
`,
    )
    const caller = buildComponent('ExtractCaller', '/src/extract-success.ts', 6)
    const bus = buildComponent('EventBus', '/src/extract-success.ts', 3, { type: 'event' })
    const pattern = syncPattern({
      name: 'extract-arg-success',
      where: { methodName: 'publish' },
      extract: { eventName: { fromArgument: 0 } },
    })

    const result = detectConfigurableConnections(project, [pattern], [caller, bus], {strict: true,})

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:useCase:ExtractCaller',
        target: 'orders:event:EventBus',
        type: 'sync',
      }),
    ])
  })
})
