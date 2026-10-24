import { assert, describe, expect, it, vi } from 'vitest'
import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import type { AiCli, RunAiCliInput, RunAiCliResult } from '../ports/ai-cli'
import type { LoadAiExtractSources } from '../ports/load-ai-extract-sources'
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
  Promise.resolve({ files: [checkoutFile], missingPaths: [] })

function loaderFor(files: readonly { filePath: string; content: string }[]): LoadAiExtractSources {
  return () => Promise.resolve({ files, missingPaths: [] })
}

const emptyResponse = JSON.stringify({ components: [], links: [] })

function eventResponse(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    components: [
      {
        type: 'Event',
        name: 'OrderPlaced',
        domain: 'orders',
        module: 'ordering',
        eventName: 'order-placed',
        sourceLocation: { repository: 'shop', filePath: checkoutFile.filePath },
        ...overrides,
      },
    ],
    links: [],
  })
}

describe('executeAiExtractStage', () => {
  it('builds prompts without invoking the AI command during a dry run', async () => {
    const run = vi.fn()
    const cli = availableCli(run)
    const result = await executeAiExtractStage(
      builder(),
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('dry-run'),
      [],
    )

    assert(result.success)
    expect(result.prompts).toHaveLength(1)
    expect(result.prompts?.[0]).toContain('publish(orderPlaced)')
    expect(run).not.toHaveBeenCalled()
    expect(cli.checkAvailability).not.toHaveBeenCalled()
  })

  it('returns an empty prompt list when no files are loaded during a dry run', async () => {
    const result = await executeAiExtractStage(
      builder(),
      config(),
      { ...collaborators(), loadAiExtractSources: loaderFor([]) },
      WorkflowRunMode.from('dry-run'),
      [],
    )

    expect(result).toStrictEqual({ success: true, diagnostics: [], warnings: [], prompts: [] })
  })

  it('fails before invoking the AI command when a configured path does not exist', async () => {
    const run = vi.fn()
    const result = await executeAiExtractStage(
      builder(),
      config(),
      {
        ...collaborators(),
        aiCli: availableCli(run),
        loadAiExtractSources: () =>
          Promise.resolve({
            files: [checkoutFile],
            missingPaths: ['/repo/src/orders', '/repo/src/orders/memory.md'],
          }),
      },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_MISSING_SOURCE',
      reason:
        'ai-extract: configured paths do not exist: /repo/src/orders, /repo/src/orders/memory.md',
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('fails before invoking the AI command when the source scope exceeds the bound', async () => {
    const run = vi.fn()
    const result = await executeAiExtractStage(
      builder(),
      config({ context: { exclude: [], maxFilesPerBatch: 1, maxBatches: 1 } }),
      {
        ...collaborators(),
        aiCli: availableCli(run),
        loadAiExtractSources: loaderFor([
          { filePath: 'a.ts', content: 'a' },
          { filePath: 'b.ts', content: 'b' },
        ]),
      },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_EXTRACT_SOURCE_BOUND_EXCEEDED',
      reason:
        "ai-extract: source scope produced 2 files, exceeds bound (max-files-per-batch * max-batches = 1). Narrow 'sources' or raise the bounds explicitly.",
    })
    expect(run).not.toHaveBeenCalled()
  })

  it('checks command availability before each batch', async () => {
    const checkAvailability = vi.fn(async () => ({ kind: 'available' as const, command: 'claude' }))
    const run = vi.fn(async () => ({ kind: 'completed' as const, output: emptyResponse }))
    const result = await executeAiExtractStage(
      builder(),
      config({ context: { exclude: [], maxFilesPerBatch: 1, maxBatches: 2 } }),
      {
        ...collaborators(),
        aiCli: { checkAvailability, run },
        loadAiExtractSources: loaderFor([
          { filePath: 'a.ts', content: 'a' },
          { filePath: 'b.ts', content: 'b' },
        ]),
      },
      WorkflowRunMode.from('run'),
      [],
    )

    assert(result.success)
    expect(result.prompts).toHaveLength(2)
    expect(run).toHaveBeenCalledTimes(2)
    expect(checkAvailability).toHaveBeenCalledTimes(2)
  })

  it('reports AI_CLI_UNAVAILABLE when the command is not available', async () => {
    const cli: AiCli = {
      checkAvailability: vi.fn(async () => ({
        kind: 'unavailable' as const,
        command: 'claude',
        reason: 'spawn claude ENOENT',
      })),
      run: vi.fn(),
    }
    const result = await executeAiExtractStage(
      builder(),
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_CLI_UNAVAILABLE',
      reason: 'spawn claude ENOENT',
    })
  })

  it('maps an incomplete AI response to AI_CLI_INCOMPLETE_RESPONSE', async () => {
    const cli = availableCli(async () => ({
      kind: 'incomplete',
      output: '',
      reason: 'truncated output',
    }))
    const result = await executeAiExtractStage(
      builder(),
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_CLI_INCOMPLETE_RESPONSE',
      reason: 'truncated output',
    })
  })

  it('maps a failed AI invocation to AI_CLI_FAILED', async () => {
    const cli = availableCli(async () => ({ kind: 'failed', reason: 'boom' }))
    const result = await executeAiExtractStage(
      builder(),
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result).toStrictEqual({ success: false, errorCode: 'AI_CLI_FAILED', reason: 'boom' })
  })

  it('maps a timed-out AI invocation to AI_CLI_TIMED_OUT', async () => {
    const cli = availableCli(async () => ({ kind: 'timed-out' }))
    const result = await executeAiExtractStage(
      builder(),
      config({ command: 'claude', timeoutSeconds: 30 }),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'AI_CLI_TIMED_OUT',
      reason: "AI CLI 'claude' timed out after 30 seconds",
    })
  })

  it('maps a malformed AI response to AI_EXTRACT_MALFORMED_RESPONSE', async () => {
    const cli = availableCli(async () => ({ kind: 'completed', output: 'not json' }))
    const result = await executeAiExtractStage(
      builder(),
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result.success).toBe(false)
    assert(!result.success)
    expect(result.errorCode).toBe('AI_EXTRACT_MALFORMED_RESPONSE')
  })

  it('passes unresolved uncertain-link diagnostics into the prompt', async () => {
    const capturedPrompts: string[] = []
    const cli = availableCli(async (input: RunAiCliInput) => {
      capturedPrompts.push(input.prompt)
      return { kind: 'completed', output: emptyResponse }
    })
    const diagnostic = WorkflowDiagnostic.fromUncertainLink({
      source: 'orders:ordering:api:place',
      target: 'orders:ordering:usecase:placeorder',
    })
    await executeAiExtractStage(
      builder(),
      config({ selection: { from: ['uncertain-links'], componentTypes: ['Event'] } }),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [diagnostic],
    )

    expect(capturedPrompts[0]).toContain(
      'orders:ordering:api:place -> orders:ordering:usecase:placeorder',
    )
  })

  it('returns the validation failure when a response writes an undeclared domain', async () => {
    const cli = availableCli(async () => ({
      kind: 'completed',
      output: eventResponse({ domain: 'billing' }),
    }))
    const result = await executeAiExtractStage(
      builder(),
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result).toStrictEqual({
      success: false,
      errorCode: 'UNDECLARED_IMPORT_DOMAIN',
      reason: 'AI extract writes undeclared domains: billing',
    })
  })

  it('applies an accepted response to the builder and returns its prompt', async () => {
    const subject = builder()
    const cli = availableCli(async () => ({ kind: 'completed', output: eventResponse() }))
    const result = await executeAiExtractStage(
      subject,
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [],
    )

    assert(result.success)
    expect(subject.components().map((component) => component.id)).toContain(
      'orders:ordering:event:orderplaced',
    )
    expect(result.prompts).toHaveLength(1)
    expect(result.warnings).toStrictEqual([])
  })

  it('reports a colliding candidate as a collision and a warning', async () => {
    const subject = builder()
    subject.upsertEvent({
      name: 'OrderPlaced',
      domain: 'orders',
      module: 'ordering',
      eventName: 'order-placed',
      sourceLocation: { repository: 'shop', filePath: checkoutFile.filePath },
    })
    const cli = availableCli(async () => ({ kind: 'completed', output: eventResponse() }))
    const result = await executeAiExtractStage(
      subject,
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [],
    )

    assert(result.success)
    expect(result.collisions).toStrictEqual(['orders:ordering:event:orderplaced'])
    expect(result.warnings).toHaveLength(1)
  })

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
        links: [],
      }),
    }))
    const result = await executeAiExtractStage(
      builder(),
      config({
        selection: { from: ['uncertain-links'], componentTypes: ['Event', 'EventHandler'] },
      }),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
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
})
