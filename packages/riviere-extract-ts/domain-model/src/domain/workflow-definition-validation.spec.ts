import { describe, expect, it } from 'vitest'
import { WorkflowStage } from './workflow-stage'
import {
  configuration,
  rehydratingWorkflowStartInput,
  workflowStartInput,
} from './__fixtures__/workflow-fixtures'
import { InvalidWorkflowDefinitionError } from './riviere-project-errors'
import { GraphWithWorkflowStartInput } from './riviere-project-start-inputs'

function codeExtractionStage(name: string): WorkflowStage {
  return WorkflowStage.fromCodeExtraction(name, configuration().resolvedConfig, 'extraction.yml')
}

describe('Workflow definition validation', () => {
  it('rejects an invalid Workflow name', () => {
    expect(() =>
      workflowStartInput([WorkflowStage.fromSchemaValidation('validate')], { name: 'Build Graph' }),
    ).toThrowError(
      new InvalidWorkflowDefinitionError(
        "Workflow name 'Build Graph' must match [a-z0-9][a-z0-9-]*",
      ),
    )
  })

  it('rejects a workflow without stages', () => {
    expect(() => workflowStartInput([])).toThrowError(
      new InvalidWorkflowDefinitionError('Workflow must define at least one stage'),
    )
  })

  it('rejects duplicate stage names across different stage kinds', () => {
    expect(() =>
      workflowStartInput([codeExtractionStage('same'), WorkflowStage.fromSchemaValidation('same')]),
    ).toThrowError(new InvalidWorkflowDefinitionError("Duplicate workflow stage name 'same'"))
  })

  it('rejects a rehydrating workflow whose stages reference undeclared domains', () => {
    expect(() =>
      rehydratingWorkflowStartInput(['shipping'], [codeExtractionStage('extract')]),
    ).toThrowError(
      new InvalidWorkflowDefinitionError(
        'Workflow stages reference undeclared domains: orders. Declared workflow domains: shipping',
      ),
    )
  })

  it('rejects a started workflow whose stages reference domains missing from the graph definition', () => {
    expect(() =>
      GraphWithWorkflowStartInput.from(
        {
          name: 'Shop',
          sources: [{ repository: 'shop' }],
          domains: { shipping: { description: 'Shipping', systemType: 'domain' } },
        },
        workflowStartInput([codeExtractionStage('extract')]),
      ),
    ).toThrowError(
      new InvalidWorkflowDefinitionError(
        'Workflow stages reference undeclared domains: orders. Declared workflow domains: shipping',
      ),
    )
  })
})
