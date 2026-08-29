import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { Project } from 'ts-morph'
import { assert, describe, expect, it } from 'vitest'
import { ExtractionConfiguration } from './extraction-configuration'
import { Workflow } from './workflow'
import { WorkflowStage } from './workflow-stage'

function configuration(): ExtractionConfiguration {
  const parsed = ValidatedConfiguration.parse({
    modules: [
      {
        api: { notUsed: true },
        domain: 'orders',
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        glob: '**/*.ts',
        name: 'orders',
        path: '.',
        ui: { notUsed: true },
        useCase: { notUsed: true },
      },
    ],
  })
  assert(parsed.success)
  const module = parsed.data.modules[0]
  assert(module)
  return ExtractionConfiguration.parse({
    name: 'orders',
    configPath: 'orders.yml',
    useTsConfig: false,
    repositoryName: 'shop',
    resolvedConfig: parsed.data,
    moduleContexts: [{ module, project: new Project(), files: [] }],
  })
}

describe('Workflow stage plan validation', () => {
  it.each([
    [
      'missing extract stages',
      [WorkflowStage.fromLink('link', configuration()), WorkflowStage.fromValidation('validate')],
      'MISSING_EXTRACT_STAGE',
    ],
    [
      'missing the link stage',
      [
        WorkflowStage.fromExtraction('extract', configuration()),
        WorkflowStage.fromValidation('validate'),
      ],
      'MISSING_LINK_STAGE',
    ],
    [
      'multiple link stages',
      [
        WorkflowStage.fromExtraction('extract', configuration()),
        WorkflowStage.fromLink('first-link', configuration()),
        WorkflowStage.fromLink('second-link', configuration()),
        WorkflowStage.fromValidation('validate'),
      ],
      'MULTIPLE_LINK_STAGES',
    ],
    [
      'missing the validate stage',
      [
        WorkflowStage.fromExtraction('extract', configuration()),
        WorkflowStage.fromLink('link', configuration()),
      ],
      'MISSING_VALIDATE_STAGE',
    ],
    [
      'multiple validate stages',
      [
        WorkflowStage.fromExtraction('extract', configuration()),
        WorkflowStage.fromLink('link', configuration()),
        WorkflowStage.fromValidation('first-validate'),
        WorkflowStage.fromValidation('second-validate'),
      ],
      'MULTIPLE_VALIDATE_STAGES',
    ],
    [
      'link before extract',
      [
        WorkflowStage.fromLink('link', configuration()),
        WorkflowStage.fromExtraction('extract', configuration()),
        WorkflowStage.fromValidation('validate'),
      ],
      'INVALID_STAGE_ORDER',
    ],
    [
      'validate before link',
      [
        WorkflowStage.fromExtraction('extract', configuration()),
        WorkflowStage.fromValidation('validate'),
        WorkflowStage.fromLink('link', configuration()),
      ],
      'INVALID_STAGE_ORDER',
    ],
  ])('rejects %s with a specific failure', (_case, stages, code) => {
    const result = Workflow.start({
      name: 'build-graph',
      outputPath: 'graph.json',
      runLogDirectory: 'logs',
      stages,
    })

    assert(!result.success)
    expect(result.error.code).toBe(code)
  })
})
