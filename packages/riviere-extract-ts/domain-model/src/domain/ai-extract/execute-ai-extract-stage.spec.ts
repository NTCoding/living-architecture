import { assert, describe, expect, it, vi } from 'vitest'
import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import type { AiCli, RunAiCliInput, RunAiCliResult } from '../ports/ai-cli'
import { WorkflowRunMode } from '../workflow'
import { collaborators } from '../__fixtures__/workflow-fixtures'
import { executeAiExtractStage } from './execute-ai-extract-stage'
import type { LoadAiExtractSources } from '../ports/load-ai-extract-sources'
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

function builder() {
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

const oneFileLoader: LoadAiExtractSources = () => ({
  files: [{ path: '/repo/src/orders/checkout.ts', content: 'publish(orderPlaced)' }],
  memory: undefined,
  promptAppend: undefined,
})

describe('executeAiExtractStage', () => {
  it('builds prompts without invoking the AI command during a dry run', async () => {
    const subject = builder()
    const run = vi.fn()
    const cli = availableCli(run)
    const result = await executeAiExtractStage(
      subject,
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
    const subject = builder()
    const result = await executeAiExtractStage(
      subject,
      config(),
      {
        ...collaborators(),
        loadAiExtractSources: () => ({ files: [], memory: undefined, promptAppend: undefined }),
      },
      WorkflowRunMode.from('dry-run'),
      [],
    )

    expect(result).toMatchObject({ success: true, prompts: [] })
  })

  it('fails before invoking the AI command when the source scope exceeds the bound', async () => {
    const subject = builder()
    const run = vi.fn()
    const result = await executeAiExtractStage(
      subject,
      config({ context: { exclude: [], maxFilesPerBatch: 1, maxBatches: 1 } }),
      {
        ...collaborators(),
        aiCli: availableCli(run),
        loadAiExtractSources: () => ({
          files: [
            { path: 'a.ts', content: 'a' },
            { path: 'b.ts', content: 'b' },
          ],
          memory: undefined,
          promptAppend: undefined,
        }),
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

  it('reports AI_CLI_UNAVAILABLE when the command is not available', async () => {
    const subject = builder()
    const cli: AiCli = {
      checkAvailability: vi.fn(async () => ({
        kind: 'unavailable' as const,
        command: 'claude',
        reason: 'spawn claude ENOENT',
      })),
      run: vi.fn(),
    }
    const result = await executeAiExtractStage(
      subject,
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
    const subject = builder()
    const cli = availableCli(async () => ({
      kind: 'incomplete',
      output: '',
      reason: 'truncated output',
    }))
    const result = await executeAiExtractStage(
      subject,
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
    const subject = builder()
    const cli = availableCli(async () => ({ kind: 'failed', reason: 'boom' }))
    const result = await executeAiExtractStage(
      subject,
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result).toStrictEqual({ success: false, errorCode: 'AI_CLI_FAILED', reason: 'boom' })
  })

  it('maps a timed-out AI invocation to AI_CLI_TIMED_OUT', async () => {
    const subject = builder()
    const cli = availableCli(async () => ({ kind: 'timed-out' }))
    const result = await executeAiExtractStage(
      subject,
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
    const subject = builder()
    const cli = availableCli(async () => ({ kind: 'completed', output: 'not json' }))
    const result = await executeAiExtractStage(
      subject,
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result.success).toBe(false)
    assert(!result.success)
    expect(result.errorCode).toBe('AI_EXTRACT_MALFORMED_RESPONSE')
  })

  it('applies a valid response and accumulates warnings across batches', async () => {
    const subject = builder()
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
            sourceLocation: { repository: 'shop', filePath: 'src/orders/checkout.ts' },
          },
        ],
        links: [],
      }),
    }))
    const result = await executeAiExtractStage(
      subject,
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [],
    )

    expect(result).toStrictEqual({ success: true, diagnostics: [], warnings: [] })
    expect(subject.components().some((item) => item.name === 'OrderPlaced')).toBe(true)
  })

  it('maps a thrown loader error to AI_EXTRACT_FAILED', async () => {
    const subject = builder()
    const result = await executeAiExtractStage(
      subject,
      config(),
      {
        ...collaborators(),
        aiCli: availableCli(async () => ({ kind: 'completed', output: '{}' })),
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

  it('passes unresolved uncertain-link diagnostics into the prompt', async () => {
    const subject = builder()
    const capturedPrompts: string[] = []
    const cli = availableCli(async (input: RunAiCliInput) => {
      capturedPrompts.push(input.prompt)
      return { kind: 'completed', output: JSON.stringify({ components: [], links: [] }) }
    })
    const diagnostic = (
      await import('../workflow-diagnostic')
    ).WorkflowDiagnostic.fromUncertainLink({
      source: 'orders:ordering:Api:place',
      target: 'orders:ordering:UseCase:place-order',
    })
    const result = await executeAiExtractStage(
      subject,
      config(),
      { ...collaborators(), aiCli: cli, loadAiExtractSources: oneFileLoader },
      WorkflowRunMode.from('run'),
      [diagnostic],
    )

    expect(result.success).toBe(true)
    expect(capturedPrompts[0]).toContain(
      'orders:ordering:Api:place -> orders:ordering:UseCase:place-order',
    )
  })

  it('returns the apply failure when a response writes an undeclared domain', async () => {
    const subject = builder()
    const cli = availableCli(async () => ({
      kind: 'completed',
      output: JSON.stringify({
        components: [
          {
            type: 'Event',
            name: 'OrderPlaced',
            domain: 'billing',
            module: 'ordering',
            eventName: 'order-placed',
            sourceLocation: { repository: 'shop', filePath: 'src/orders/checkout.ts' },
          },
        ],
        links: [],
      }),
    }))
    const result = await executeAiExtractStage(
      subject,
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
})
