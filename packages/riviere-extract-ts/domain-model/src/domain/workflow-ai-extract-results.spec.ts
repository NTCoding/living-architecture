import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
import { assert, describe, expect, it } from 'vitest'
import { Workflow, WorkflowRunMode } from './workflow'
import { WorkflowDiagnostic } from './workflow-diagnostic'
import { WorkflowStage } from './workflow-stage'
import { builder, workflowStartInput } from './__fixtures__/workflow-fixtures'

const aiExtractConfig: AiExtractConfig = {
  command: 'claude',
  args: ['-p'],
  timeoutSeconds: 60,
  sources: ['src'],
  selection: { from: ['missing-events'], componentTypes: ['Event'] },
  outputs: { addComponents: true, addLinks: true },
  context: { exclude: ['**/*.spec.ts'], maxFilesPerBatch: 10, maxBatches: 2 },
}

function workflow(): Workflow {
  return Workflow.build(
    workflowStartInput(
      [
        WorkflowStage.fromAiExtract('discover-gaps', aiExtractConfig),
        WorkflowStage.fromSchemaValidation('validate'),
      ],
      { outputPath: '.riviere/graph.json', runLogDirectory: '.riviere/logs' },
    ),
  )
}

describe('Workflow AI extract results', () => {
  it('records candidate collisions and resolved diagnostics as run events', async () => {
    const unresolved = WorkflowDiagnostic.fromUncertainLink({
      source: 'orders:ordering:event:orderplaced',
      target: 'orders:ordering:eventhandler:orderplacedhandler',
    })
    const remaining = WorkflowDiagnostic.fromMissingField(
      'orders:ordering:usecase:placeorder',
      'description',
    )
    const seen: { diagnostics: readonly WorkflowDiagnostic[] } = { diagnostics: [] }

    const run = workflow()
    const result = await run.run(builder(), WorkflowRunMode.from('run'), (stage, context) => {
      if (stage.kind === 'ai-extract') {
        return {
          success: true,
          diagnostics: [unresolved, remaining],
          warnings: [],
          collisions: ['orders:ordering:event:orderplaced'],
          resolvedDiagnostics: [unresolved],
        }
      }
      seen.diagnostics = context.diagnostics
      return { success: true, diagnostics: [], warnings: [] }
    })

    assert(result.value.success)
    expect(
      result.value.events
        .filter(
          (event) =>
            event.type === 'AiExtractCandidateAlreadyPresent' ||
            event.type === 'DiagnosticResolved',
        )
        .map((event) => ({ type: event.type, detail: event.detail })),
    ).toStrictEqual([
      {
        type: 'AiExtractCandidateAlreadyPresent',
        detail: {
          kind: 'candidate-already-present',
          candidateId: 'orders:ordering:event:orderplaced',
        },
      },
      {
        type: 'DiagnosticResolved',
        detail: { kind: 'diagnostic-resolved', diagnostic: unresolved },
      },
    ])
    expect(seen.diagnostics).toStrictEqual([remaining])
  })

  it('reports collected prompts when a later stage fails', async () => {
    const result = await workflow().run(builder(), WorkflowRunMode.from('run'), (stage) =>
      stage.kind === 'ai-extract'
        ? { success: true, diagnostics: [], warnings: [], prompts: ['gap prompt'] }
        : { success: false, errorCode: 'SCHEMA_INVALID', reason: 'Schema invalid' },
    )

    assert(!result.value.success)
    expect(result.value.prompts).toStrictEqual(['gap prompt'])
  })
})
