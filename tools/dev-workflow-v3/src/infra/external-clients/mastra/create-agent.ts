import { Agent } from '@mastra/core/agent'
import type { ToolsInput } from '@mastra/core/agent'
import type { Memory } from '@mastra/memory'
import { createWorkspace } from './create-workspace'

/** @riviere-role external-client-model */
export interface AgentRequest {
  readonly id: string
  readonly model: string
  readonly instructions: string
  readonly workspacePath: string | null
  readonly useTools: boolean
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
      ...(request.workspacePath === null
        ? {}
        : { workspace: createWorkspace(request.workspacePath) }),
    })
}
