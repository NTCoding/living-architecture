import { join } from 'node:path'
import { assert, afterEach, describe, expect, it } from 'vitest'
import { createRiviereProjectRepository } from '../../../__fixtures__/riviere-project-repository-fixtures'
import {
  cleanupWorkflowWorkspaces,
  createWorkflowWorkspace as workspace,
} from '../../../__fixtures__/riviere-project-workspace-fixtures'
import { writeImportStage } from '../../../__fixtures__/riviere-project-workflow-fixtures'
import { RunWorkflow } from './run-workflow'

afterEach(cleanupWorkflowWorkspaces)

describe('RunWorkflow with a missing import source', () => {
  it('resolves with a structured failure when the import source does not exist', async () => {
    const directory = workspace()
    writeImportStage(
      directory,
      'eventcatalog-import',
      ['domains: {}', 'services: {}', 'events: {}'],
      { sourceFile: false },
    )

    const result = await new RunWorkflow(createRiviereProjectRepository()).execute({
      workflowPath: join(directory, '.riviere', 'workflows', 'combined.yaml'),
    })

    assert(!result.result.success)
    expect(result.result.errorCode).toBe('VALIDATION_ERROR')
    expect(result.result.reason).toMatch(
      /Cannot resolve source 'imported\.json' declared in '.*import\.yaml'\. File not found: /,
    )
  })
})
