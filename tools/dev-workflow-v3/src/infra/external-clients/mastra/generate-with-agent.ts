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
  readonly timeBudgetMs: number
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
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), request.timeBudgetMs)
    try {
      const options = { ...conversationOptions(request), abortSignal: abort.signal }
      const response =
        request.responseSchema === null
          ? await agent.generate(request.prompt, options)
          : await agent.generate(request.prompt, {
              ...options,
              structuredOutput: { schema: request.responseSchema },
            })
      return {
        object: response.object,
        text: response.text,
        finishReason: String(response.finishReason),
        suspendPayload: response.suspendPayload,
      }
    } catch (error) {
      if (!abort.signal.aborted) throw error
      return { object: undefined, text: '', finishReason: 'aborted', suspendPayload: null }
    } finally {
      clearTimeout(timer)
    }
  }
}
