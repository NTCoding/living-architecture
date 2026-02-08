import {
  describe, it, expect 
} from 'vitest'
import type { Project } from 'ts-morph'
import type { ConnectionPattern } from '@living-architecture/riviere-extract-config'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type { ExtractedLink } from '../extracted-link'
import { buildComponent } from '../call-graph/call-graph-fixtures'
import { ComponentIndex } from '../component-index'
import { ConnectionDetectionError } from '../connection-detection-error'
import { detectConfigurableConnections as detectConfigurableConnectionsImpl } from './detect-configurable-connections'
import { createTestProject } from './configurable-fixtures'

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

describe('detectConfigurableConnections - strict/lenient mode', () => {
  it('throws ConnectionDetectionError in strict mode when extract rule returns undefined', () => {
    const project = createTestProject()
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
      detectConfigurableConnections(project, [pattern], [caller, bus], {
        strict: true,
        repository: 'test-repo',
      }),
    ).toThrow(ConnectionDetectionError)
  })

  it('produces link with _uncertain field in lenient mode when extract rule returns undefined', () => {
    const project = createTestProject()
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

    const result = detectConfigurableConnections(project, [pattern], [caller, bus], {
      strict: false,
      repository: 'test-repo',
    })

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
    const project = createTestProject()
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

    const result = detectConfigurableConnections(project, [pattern], [caller, bus], {
      strict: true,
      repository: 'test-repo',
    })

    expect(result).toStrictEqual([
      expect.objectContaining({
        source: 'orders:useCase:ExtractCaller',
        target: 'orders:event:EventBus',
        type: 'sync',
      }),
    ])
    expect(result[0]).not.toHaveProperty('_uncertain')
  })

  it('replaces uncertain match with certain match when deduplicating', () => {
    const project = createTestProject()
    project.createSourceFile(
      '/src/dedup-prefer-certain.ts',
      `
class EventBus {
  publish(name: string): void {}
}
class DedupCaller {
  constructor(private bus: EventBus) {}
  execute(): void {
    const dynamicName = getDynamicName()
    this.bus.publish(dynamicName)
    this.bus.publish('OrderCreated')
  }
}
function getDynamicName(): string { return 'DynamicEvent' }
`,
    )
    const caller = buildComponent('DedupCaller', '/src/dedup-prefer-certain.ts', 5)
    const bus = buildComponent('EventBus', '/src/dedup-prefer-certain.ts', 2, { type: 'event' })
    const pattern = syncPattern({
      name: 'event-publish-dedup',
      where: { methodName: 'publish' },
      extract: { eventName: { fromArgument: 0 } },
    })

    const result = detectConfigurableConnections(project, [pattern], [caller, bus], {
      strict: false,
      repository: 'test-repo',
    })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      source: 'orders:useCase:DedupCaller',
      target: 'orders:event:EventBus',
      type: 'sync',
      sourceLocation: {
        repository: 'test-repo',
        filePath: '/src/dedup-prefer-certain.ts',
        lineNumber: 10,
        methodName: 'execute',
      },
    })
    expect(result[0]).not.toHaveProperty('_uncertain')
  })
})
