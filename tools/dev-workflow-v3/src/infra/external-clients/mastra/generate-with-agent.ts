import type { Agent } from '@mastra/core/agent'
import type { z } from 'zod'
import type { AgentRequest } from './create-agent'

/** @riviere-role external-client-model */
export interface AgentGenerationRequest {
  readonly agentId: string
  readonly model: string
  readonly instructions: string
  readonly prompt: string
  readonly workspacePath: string | null
  readonly threadId: string | null
  readonly responseSchema: z.ZodType<unknown> | null
  readonly maxSteps: number
}

/** @riviere-role external-client-model */
export interface AgentGeneration {
  readonly object: unknown
  readonly text: string
  readonly finishReason: string
  readonly suspendPayload: unknown
}

function conversationOptions(request: AgentGenerationRequest) {
  return {
    maxSteps: request.maxSteps,
    ...(request.threadId === null
      ? {}
      : {
          memory: { thread: request.threadId, resource: 'factory' },
          autoResumeSuspendedTools: true,
        }),
  }
}

/**
 * @riviere-role external-client-service
 */
export function createAgentGeneration(dependencies: {
  readonly agentFor: (request: AgentRequest) => Agent
}): (request: AgentGenerationRequest) => Promise<AgentGeneration> {
  return async (request) => {
    const agent = dependencies.agentFor({
      id: request.agentId,
      model: request.model,
      instructions: request.instructions,
      workspacePath: request.workspacePath,
    })
    const response =
      request.responseSchema === null
        ? await agent.generate(request.prompt, conversationOptions(request))
        : await agent.generate(request.prompt, {
            ...conversationOptions(request),
            structuredOutput: { schema: request.responseSchema },
          })
    return {
      object: response.object,
      text: response.text,
      finishReason: String(response.finishReason),
      suspendPayload: response.suspendPayload,
    }
  }
}
