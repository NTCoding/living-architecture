import { Agent } from '@mastra/core/agent'
import type { Memory } from '@mastra/memory'
import type { Workspace } from '@mastra/core/workspace'
import type { ModelIdentifier } from '@living-architecture/dev-workflow-v3-domain-model'
import { askUser } from '../tools/ask-user'

const IMPLEMENTER_INSTRUCTIONS = [
  'You are the implementer in a software factory workflow.',
  'Write the code in the workspace, following the plan and the repository guidance.',
  'Run the checks, read the failures, and fix them, up to a sensible number of attempts.',
  'When you cannot decide alone, use the ask-user tool and wait for the answer.',
  'Do not push, do not open a pull request, and do not merge anything. The workflow does those.',
  'When you are done, return the summary as the "summary" field.',
].join('\n')

/** @riviere-role agent-configuration */
export function createImplementerAgent(dependencies: {
  readonly model: ModelIdentifier
  readonly workspace: Workspace
  readonly memory: Memory
}): Agent {
  return new Agent({
    id: 'implementer',
    name: 'Implementer',
    instructions: IMPLEMENTER_INSTRUCTIONS,
    model: dependencies.model.value(),
    workspace: dependencies.workspace,
    tools: { askUser },
    memory: dependencies.memory,
    defaultOptions: { autoResumeSuspendedTools: true },
  })
}
