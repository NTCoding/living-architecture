import { assert, describe, expect, it } from 'vitest'
import { Workflow } from './workflow'
import { WorkflowStage } from './workflow-stage'
import { configuration } from './__fixtures__/workflow-fixtures'

describe('Workflow definition validation', () => {
  it('rejects an invalid Workflow name', () => {
    const result = Workflow.start({
      name: 'Build Graph',
      outputPath: 'graph.json',
      runLogDirectory: 'logs',
      stages: [WorkflowStage.fromSchemaValidation('validate')],
    })

    assert(!result.success)
    expect(result.error).toMatchObject({
      code: 'INVALID_WORKFLOW_NAME',
      message: "Workflow name 'Build Graph' must match [a-z0-9][a-z0-9-]*",
    })
  })

  it('rejects a workflow without stages', () => {
    const result = Workflow.start({
      name: 'build-graph',
      outputPath: 'graph.json',
      runLogDirectory: 'logs',
      stages: [],
    })

    assert(!result.success)
    expect(result.error).toMatchObject({
      code: 'MISSING_WORKFLOW_STAGE',
      message: 'Workflow must define at least one stage',
    })
  })

  it('rejects duplicate stage names across different stage kinds', () => {
    const result = Workflow.start({
      name: 'build-graph',
      outputPath: 'graph.json',
      runLogDirectory: 'logs',
      stages: [
        WorkflowStage.fromCodeExtraction('same', configuration().resolvedConfig),
        WorkflowStage.fromSchemaValidation('same'),
      ],
    })

    assert(!result.success)
    expect(result.error).toMatchObject({
      code: 'DUPLICATE_STAGE_NAME',
      message: "Duplicate workflow stage name 'same'",
    })
  })
})
