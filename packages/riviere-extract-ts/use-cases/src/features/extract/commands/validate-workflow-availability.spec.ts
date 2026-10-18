import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { unavailableAiCli } from '../../../__fixtures__/ai-cli-fixtures'
import { createRiviereProjectRepository } from '../../../__fixtures__/riviere-project-repository-fixtures'
import {
  cleanupWorkflowWorkspaces,
  createWorkflowWorkspace,
} from '../../../__fixtures__/riviere-project-workspace-fixtures'
import { writeWorkflow } from '../../../__fixtures__/riviere-project-workflow-fixtures'
import { ValidateWorkflow } from './validate-workflow'

afterEach(cleanupWorkflowWorkspaces)

function writeUnavailableAiExtractWorkflow(): string {
  const directory = createWorkflowWorkspace()
  writeFileSync(
    join(directory, '.riviere', 'workflows', 'ai-extract.yaml'),
    [
      'command: claude',
      'args:',
      '  - -p',
      'timeout-seconds: 60',
      'sources:',
      '  - src',
      'selection:',
      '  from:',
      '    - missing-events',
      '  component-types:',
      '    - Event',
      'outputs:',
      '  add-components: true',
      '  add-links: true',
      'context:',
      '  exclude: []',
      '  max-files-per-batch: 10',
      '  max-batches: 2',
    ].join('\n'),
  )
  writeWorkflow(directory, '  - kind: ai-extract\n    name: discover\n    config: ai-extract.yaml')
  return join(directory, '.riviere', 'workflows', 'combined.yaml')
}

describe('ValidateWorkflow with an unavailable AI CLI fixture', () => {
  it('returns AI_CLI_UNAVAILABLE for a configured AI stage', () => {
    const workflowPath = writeUnavailableAiExtractWorkflow()
    const repository = createRiviereProjectRepository(
      undefined,
      undefined,
      undefined,
      unavailableAiCli(),
    )

    const result = new ValidateWorkflow(repository).execute({ workflowPath })

    expect(result).toStrictEqual({
      result: {
        success: false,
        errorCode: 'AI_CLI_UNAVAILABLE',
        reason: "AI CLI 'claude' is unavailable: AI CLI is not configured",
      },
    })
  })
})
