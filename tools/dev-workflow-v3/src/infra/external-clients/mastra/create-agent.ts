import { Agent } from '@mastra/core/agent'
import type { ToolsInput } from '@mastra/core/agent'
import type { Memory } from '@mastra/memory'
import { TokenLimiter, ToolCallFilter } from '@mastra/core/processors'
import { createWorkspace } from './create-workspace'

/**
 * The implementer works one issue on one thread that only grows, and the reviewers read a whole
 * change. Both would eventually hand the model more than it can hold. This budget keeps a long
 * coding session in the prompt while leaving room, inside a 200k context, for the instructions,
 * the workspace description and the answer.
 */
const CONVERSATION_TOKEN_BUDGET = 120_000

/** @riviere-role external-client-model */
export interface AgentRequest {
  readonly id: string
  readonly model: string
  readonly instructions: string
  readonly workspacePath: string | null
  readonly useTools: boolean
  readonly workspaceWritable: boolean
}

/**
 * @riviere-role external-client-service
 */
export function createAgentFactory(dependencies: {
  readonly memory: Memory
  readonly tools: ToolsInput
}): (request: AgentRequest) => Agent {
  return (request) =>
    new Agent({
      id: request.id,
      name: request.id,
      instructions: request.instructions,
      model: request.model,
      tools: request.useTools ? dependencies.tools : {},
      memory: dependencies.memory,
      ...(request.useTools
        ? {
            inputProcessors: [
              new ToolCallFilter(),
              new TokenLimiter({ limit: CONVERSATION_TOKEN_BUDGET }),
            ],
          }
        : {}),
      ...(request.workspacePath === null
        ? {}
        : {
            workspace: createWorkspace(request.workspacePath, {
              readOnly: !request.workspaceWritable,
            }),
          }),
    })
}
