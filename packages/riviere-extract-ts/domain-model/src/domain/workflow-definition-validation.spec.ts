import { describe, expect, it } from 'vitest'
import { WorkflowStage } from './workflow-stage'
import { configuration } from './__fixtures__/workflow-fixtures'
import { InvalidWorkflowDefinitionError } from './riviere-project-errors'
import { WorkflowStartInput } from './riviere-project-start-inputs'

describe('Workflow definition validation', () => {
  it('rejects an invalid Workflow name', () => {
    expect(() =>
      WorkflowStartInput.from({
        declaredDomains: ['orders'],
        name: 'Build Graph',
        outputPath: 'graph.json',
        runLogDirectory: 'logs',
        stages: [WorkflowStage.fromSchemaValidation('validate')],
      }),
    ).toThrowError("Workflow name 'Build Graph' must match [a-z0-9][a-z0-9-]*")
  })

  it('rejects a workflow without stages', () => {
    expect(() =>
      WorkflowStartInput.from({
        declaredDomains: ['orders'],
        name: 'build-graph',
        outputPath: 'graph.json',
        runLogDirectory: 'logs',
        stages: [],
      }),
    ).toThrowError('Workflow must define at least one stage')
  })

  it('rejects duplicate stage names across different stage kinds', () => {
    expect(() =>
      WorkflowStartInput.from({
        declaredDomains: ['orders'],
        name: 'build-graph',
        outputPath: 'graph.json',
        runLogDirectory: 'logs',
        stages: [
          WorkflowStage.fromCodeExtraction(
            'same',
            configuration().resolvedConfig,
            'extraction.yml',
          ),
          WorkflowStage.fromSchemaValidation('same'),
        ],
      }),
    ).toThrowError("Duplicate workflow stage name 'same'")
  })

  it('rejects a stage domain that the declared domains do not include', () => {
    expect(() =>
      WorkflowStartInput.from({
        declaredDomains: ['shipping'],
        name: 'build-graph',
        outputPath: 'graph.json',
        runLogDirectory: 'logs',
        stages: [
          WorkflowStage.fromCodeExtraction(
            'extract',
            configuration().resolvedConfig,
            'extraction.yml',
          ),
        ],
      }),
    ).toThrowError(
      new InvalidWorkflowDefinitionError(
        'Workflow stages reference undeclared domains: orders. Declared workflow domains: shipping',
      ),
    )
  })
})
