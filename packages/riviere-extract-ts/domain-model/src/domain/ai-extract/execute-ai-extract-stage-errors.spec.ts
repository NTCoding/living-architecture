import { assert, describe, expect, it, vi } from 'vitest'
import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import type { AiCli, RunAiCliInput, RunAiCliResult } from '../ports/ai-cli'
import type { LoadAiExtractSources } from '../ports/load-ai-extract-sources'
import type { ReadAiExtractSourceFiles } from '../ports/read-ai-extract-source-files'
import { WorkflowDiagnostic } from '../workflow-diagnostic'
import { WorkflowRunMode } from '../workflow'
import { collaborators } from '../__fixtures__/workflow-fixtures'
import { executeAiExtractStage } from './execute-ai-extract-stage'
import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'

function config(overrides: Partial<AiExtractConfig> = {}): AiExtractConfig {
  return {
    command: 'claude',
    args: [],
    timeoutSeconds: 60,
    sources: ['src/**/*.ts'],
    selection: { from: ['missing-events'], componentTypes: ['Event'] },
    outputs: { addComponents: true, addLinks: true },
    context: { exclude: [], maxFilesPerBatch: 10, maxBatches: 2 },
    ...overrides,
  }
}

function builder(): RiviereBuilder {
  return RiviereBuilder.parse({
    name: 'Shop',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
}

function availableCli(run: (input: RunAiCliInput) => Promise<RunAiCliResult>): AiCli {
  return {
    checkAvailability: vi.fn(async () => ({ kind: 'available' as const, command: 'claude' })),
    run: vi.fn(run),
  }
}

const checkoutFile = {
  filePath: '/repo/src/orders/checkout.ts',
  content: 'publish(orderPlaced)',
}

const oneFileLoader: LoadAiExtractSources = () =>
  Promise.resolve({ filePaths: [checkoutFile.filePath], missingPaths: [] })

const oneFileReader: ReadAiExtractSourceFiles = (filePaths) =>
  Promise.resolve(filePaths.includes(checkoutFile.filePath) ? [checkoutFile] : [])

const emptyResponse = JSON.stringify({ components: [], links: [] })

const secondFile = { filePath: '/repo/src/orders/other.ts', content: 'other' }

function loaderFor(files: readonly { filePath: string; content: string }[]): LoadAiExtractSources {
  return () => Promise.resolve({ filePaths: files.map((file) => file.filePath), missingPaths: [] })
}

function readerFor(
  files: readonly { filePath: string; content: string }[],
): ReadAiExtractSourceFiles {
  return (filePaths) => Promise.resolve(files.filter((file) => filePaths.includes(file.filePath)))
}

describe('executeAiExtractStage', () => {
  it('reports diagnostics resolved by the applied response', async () => {
    const diagnostic = WorkflowDiagnostic.fromUncertainLink({
      source: 'orders:ordering:event:orderplaced',
      target: 'orders:ordering:eventhandler:orderplacedhandler',
    })
    const cli = availableCli(async () => ({
      kind: 'completed',
      output: JSON.stringify({
        components: [
          {
            type: 'Event',
            name: 'OrderPlaced',
            domain: 'orders',
            module: 'ordering',
            eventName: 'order-placed',
            sourceLocation: { repository: 'shop', filePath: checkoutFile.filePath },
          },
          {
            type: 'EventHandler',
            name: 'OrderPlacedHandler',
            domain: 'orders',
            module: 'ordering',
            subscribedEvents: ['order-placed'],
            sourceLocation: { repository: 'shop', filePath: checkoutFile.filePath },
          },
        ],
        links: [
          {
            source: 'orders:ordering:event:orderplaced',
            target: 'orders:ordering:eventhandler:orderplacedhandler',
            type: 'async',
          },
        ],
      }),
    }))
    const result = await executeAiExtractStage(
      builder(),
      config({
        selection: { from: ['uncertain-links'], componentTypes: ['Event', 'EventHandler'] },
      }),
      {
        ...collaborators(),
        aiCli: cli,
        loadAiExtractSources: oneFileLoader,
        readAiExtractSourceFiles: oneFileReader,
      },
      WorkflowRunMode.from('run'),
      [diagnostic],
    )

    assert(result.success)
    expect(result.resolvedDiagnostics).toStrictEqual([diagnostic])
  })

  it('maps a thrown loader error to AI_EXTRACT_FAILED', async () => {
    const result = await executeAiExtractStage(
      builder(),
      config(),
      {
        ...collaborators(),
        loadAiExtractSources: () => {
          class BoomError extends Error {}
          throw new BoomError('boom')
        },
        readAiExtractSourceFiles: oneFileReader,
      },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_FAILED',
      reason: 'AI extract failed: Error: boom',
    })
  })

  it('maps a thrown non-Error value to AI_EXTRACT_FAILED', async () => {
    const result = await executeAiExtractStage(
      builder(),
      config(),
      {
        ...collaborators(),
        loadAiExtractSources: () => {
          throw 'boom'
        },
        readAiExtractSourceFiles: oneFileReader,
      },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_FAILED',
      reason: 'AI extract failed: boom',
    })
  })
  it('does not carry a diagnostic resolved in an earlier batch into a later batch prompt', async () => {
    const capturedPrompts: string[] = []
    const resolvingResponse = JSON.stringify({
      components: [
        {
          type: 'Event',
          name: 'OrderPlaced',
          domain: 'orders',
          module: 'ordering',
          eventName: 'order-placed',
          sourceLocation: { repository: 'shop', filePath: checkoutFile.filePath },
        },
        {
          type: 'EventHandler',
          name: 'OrderPlacedHandler',
          domain: 'orders',
          module: 'ordering',
          subscribedEvents: ['order-placed'],
          sourceLocation: { repository: 'shop', filePath: checkoutFile.filePath },
        },
      ],
      links: [
        {
          source: 'orders:ordering:event:orderplaced',
          target: 'orders:ordering:eventhandler:orderplacedhandler',
          type: 'async',
        },
      ],
    })
    const cli = availableCli(async (input: RunAiCliInput) => {
      capturedPrompts.push(input.prompt)
      if (capturedPrompts.length === 1) {
        return { kind: 'completed' as const, output: resolvingResponse }
      }
      return { kind: 'completed' as const, output: emptyResponse }
    })
    const diagnostic = WorkflowDiagnostic.fromUncertainLink({
      source: 'orders:ordering:event:orderplaced',
      target: 'orders:ordering:eventhandler:orderplacedhandler',
    })
    const result = await executeAiExtractStage(
      builder(),
      config({
        selection: { from: ['uncertain-links'], componentTypes: ['Event', 'EventHandler'] },
        context: { exclude: [], maxFilesPerBatch: 1, maxBatches: 2 },
      }),
      {
        ...collaborators(),
        aiCli: cli,
        loadAiExtractSources: loaderFor([checkoutFile, secondFile]),
        readAiExtractSourceFiles: readerFor([checkoutFile, secondFile]),
      },
      WorkflowRunMode.from('run'),
      [diagnostic],
    )

    assert(result.success)
    expect(capturedPrompts).toHaveLength(2)
    expect(capturedPrompts[0]).toContain(
      'orders:ordering:event:orderplaced -> orders:ordering:eventhandler:orderplacedhandler',
    )
    expect(capturedPrompts[1]).toContain('Unresolved uncertain links:\nSource files')
  })
})
