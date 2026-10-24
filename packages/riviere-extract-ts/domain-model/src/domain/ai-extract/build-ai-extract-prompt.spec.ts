import { describe, expect, it } from 'vitest'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { WorkflowDiagnostic } from '../workflow-diagnostic'
import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import { aiExtractGapContext } from './ai-extract-gap-context'
import type { AiExtractGapContext } from './ai-extract-gap-context'
import { buildAiExtractPrompt } from './build-ai-extract-prompt'
import type { AiExtractSourceBatch } from './select-ai-extract-batches'

function config(overrides: Partial<AiExtractConfig> = {}): AiExtractConfig {
  return {
    command: 'claude',
    args: [],
    timeoutSeconds: 60,
    sources: ['src/**/*.ts'],
    selection: {
      from: ['uncertain-links', 'missing-events', 'missing-event-handlers', 'missing-use-cases'],
      componentTypes: ['Event', 'UseCase'],
    },
    outputs: { addComponents: true, addLinks: true },
    context: { exclude: [], maxFilesPerBatch: 10, maxBatches: 2 },
    ...overrides,
  }
}

function batch(): AiExtractSourceBatch {
  return {
    index: 0,
    files: [{ path: '/repo/src/orders/checkout.ts', content: 'publish(orderPlaced)' }],
  }
}

describe('buildAiExtractPrompt', () => {
  it('includes repository, allowed types, and output flags', () => {
    const subject = aiExtractGapContext([], [], [])

    const prompt = buildAiExtractPrompt({
      repositoryName: 'shop',
      config: config(),
      context: subject,
      batch: batch(),
      batchCount: 1,
      memory: {
        prose: 'Some learnings\nsuppress: orders:ordering:Event:order-placed',
        suppressedComponentIds: ['orders:ordering:Event:order-placed'],
      },
      promptAppend: 'Extra instruction',
    })

    expect(prompt).toContain("repository 'shop'")
    expect(prompt).toContain('Allowed component types: Event, UseCase')
    expect(prompt).toContain('Components may be added: yes')
    expect(prompt).toContain('Links may be added: yes')
  })

  it('includes batch source delimiters and contents', () => {
    const subject = aiExtractGapContext([], [], [])

    const prompt = buildAiExtractPrompt({
      repositoryName: 'shop',
      config: config(),
      context: subject,
      batch: batch(),
      batchCount: 1,
      memory: {
        prose: 'Some learnings\nsuppress: orders:ordering:Event:order-placed',
        suppressedComponentIds: ['orders:ordering:Event:order-placed'],
      },
      promptAppend: 'Extra instruction',
    })

    expect(prompt).toContain('--- /repo/src/orders/checkout.ts ---')
    expect(prompt).toContain('publish(orderPlaced)')
    expect(prompt).toContain('Source files (batch 1 of 1)')
    expect(prompt).toContain('Respond with a single JSON object and nothing else:')
  })

  it('includes memory prose, suppressed ids, and prompt append', () => {
    const subject = aiExtractGapContext([], [], [])

    const prompt = buildAiExtractPrompt({
      repositoryName: 'shop',
      config: config(),
      context: subject,
      batch: batch(),
      batchCount: 1,
      memory: {
        prose: 'Some learnings\nsuppress: orders:ordering:Event:order-placed',
        suppressedComponentIds: ['orders:ordering:Event:order-placed'],
      },
      promptAppend: 'Extra instruction',
    })

    expect(prompt).toContain('Memory:')
    expect(prompt).toContain('Some learnings')
    expect(prompt).toContain(
      'Suppressed component IDs (never propose these): orders:ordering:Event:order-placed',
    )
    expect(prompt).toContain('Additional instructions:')
  })

  it('renders existing components, links, and uncertain links', () => {
    const subjectBuilder = RiviereBuilder.parse({
      name: 'Shop',
      sources: [{ repository: 'shop' }],
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
    })
    subjectBuilder.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-placed',
      sourceLocation: { repository: 'shop', filePath: 'src/orders/order.ts' },
    })
    subjectBuilder.upsertUseCase({
      name: 'PlaceOrder',
      domain: 'orders',
      module: 'ordering',
      sourceLocation: { repository: 'shop', filePath: 'src/orders/place.ts' },
    })
    subjectBuilder.upsertLink({
      from: 'orders:ordering:event:orderplaced',
      to: 'orders:ordering:usecase:placeorder',
      type: 'async',
      sourceLocation: { repository: 'shop', filePath: 'src/orders/order.ts' },
    })
    const context = aiExtractGapContext(subjectBuilder.components(), subjectBuilder.links(), [])

    const prompt = buildAiExtractPrompt({
      repositoryName: 'shop',
      config: config({ selection: { from: ['missing-events'], componentTypes: ['Event'] } }),
      context,
      batch: { index: 0, files: [] },
      batchCount: 2,
      memory: { prose: undefined, suppressedComponentIds: [] },
      promptAppend: undefined,
    })

    expect(prompt).toContain('Existing components:')
    expect(prompt).toContain('- orders:ordering:event:orderplaced')
    expect(prompt).toContain('Existing links:')
    expect(prompt).toContain(
      '- orders:ordering:event:orderplaced -> orders:ordering:usecase:placeorder',
    )
  })

  it('renders the missing-event-handlers gap with and without an event name', () => {
    const context = aiExtractGapContext([], [], [])
    const contextWithEvent: AiExtractGapContext = {
      ...context,
      eventsWithoutHandler: [
        { componentId: 'orders:ordering:event:orderplaced', eventName: 'order-placed' },
        { componentId: 'orders:ordering:event:unnamed', eventName: undefined },
      ],
    }

    const prompt = buildAiExtractPrompt({
      repositoryName: 'shop',
      config: config({
        selection: { from: ['missing-event-handlers'], componentTypes: ['EventHandler'] },
      }),
      context: contextWithEvent,
      batch: { index: 0, files: [] },
      batchCount: 1,
      memory: { prose: undefined, suppressedComponentIds: [] },
      promptAppend: undefined,
    })

    expect(prompt).toContain('orders:ordering:event:orderplaced (event name: order-placed)')
    expect(prompt).toContain('orders:ordering:event:unnamed')
    expect(prompt).toContain('Components may be added: yes')
  })

  it('renders the uncertain-links gap with diagnostic details', () => {
    const realDiagnostic = WorkflowDiagnostic.fromUncertainLink({
      source: 'orders:ordering:Api:place',
      target: 'orders:ordering:UseCase:place-order',
      sourceLocation: { repository: 'shop', filePath: 'src/orders/place.ts' },
    })
    const context = aiExtractGapContext([], [], [realDiagnostic])

    const prompt = buildAiExtractPrompt({
      repositoryName: 'shop',
      config: config({ selection: { from: ['uncertain-links'], componentTypes: ['UseCase'] } }),
      context,
      batch: { index: 0, files: [] },
      batchCount: 1,
      memory: { prose: undefined, suppressedComponentIds: [] },
      promptAppend: undefined,
    })

    expect(prompt).toContain('orders:ordering:Api:place -> orders:ordering:UseCase:place-order')
  })

  it('reports addComponents and addLinks as no when disabled', () => {
    const prompt = buildAiExtractPrompt({
      repositoryName: 'shop',
      config: config({
        selection: { from: ['missing-events'], componentTypes: ['Event'] },
        outputs: { addComponents: false, addLinks: false },
      }),
      context: aiExtractGapContext([], [], []),
      batch: { index: 0, files: [] },
      batchCount: 1,
      memory: { prose: undefined, suppressedComponentIds: [] },
      promptAppend: undefined,
    })

    expect(prompt).toContain('Components may be added: no')
    expect(prompt).toContain('Links may be added: no')
  })
})
