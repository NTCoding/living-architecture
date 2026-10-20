import type { Agent } from '@mastra/core/agent'
import type { z } from 'zod'
import type { AgentRequest } from './create-agent'

/** @riviere-role external-client-model */
export interface AgentGenerationRequest {
  readonly agentId: string
  readonly model: string
  readonly thinking: string
  readonly instructions: string
  readonly prompt: string
  readonly workspacePath: string | null
  readonly threadId: string | null
  readonly useTools: boolean
  readonly workspaceWritable: boolean
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
    providerOptions: {
      [providerOf(request.model)]: { reasoningEffort: reasoningEffortOf(request.thinking) },
    },
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
  return async (request) => generateWithRetry(dependencies, request, 0)
}

function isEmptyAnswer(response: AgentGeneration): boolean {
  return (
    response.finishReason === 'stop' && response.text.trim() === '' && response.object === undefined
  )
}

async function generateWithRetry(
  dependencies: { readonly agentFor: (request: AgentRequest) => Agent },
  request: AgentGenerationRequest,
  attempt: number,
): Promise<AgentGeneration> {
  const response = await generateOnce(dependencies, request)
  if (!isEmptyAnswer(response) || attempt >= 2) return response
  return generateWithRetry(dependencies, request, attempt + 1)
}

async function generateOnce(
  dependencies: { readonly agentFor: (request: AgentRequest) => Agent },
  request: AgentGenerationRequest,
): Promise<AgentGeneration> {
  {
    const agent = dependencies.agentFor({
      id: request.agentId,
      model: request.model,
      instructions: request.instructions,
      workspacePath: request.workspacePath,
      useTools: request.useTools,
      workspaceWritable: request.workspaceWritable,
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
              structuredOutput: { schema: request.responseSchema, model: request.model },
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

function providerOf(model: string): string {
  const provider = model.split('/')[0]
  if (provider === undefined || provider === '' || model.includes('/') === false) {
    throw new InvalidModelIdentifier(model)
  }
  return provider
}

function reasoningEffortOf(level: string): 'none' | 'low' | 'medium' | 'high' {
  if (level === 'off') return 'none'
  if (level === 'low' || level === 'medium' || level === 'high') return level
  throw new InvalidThinkingLevel(level)
}

class InvalidModelIdentifier extends Error {
  constructor(model: string) {
    super(`The model ${model} is not provider/model.`)
    this.name = 'InvalidModelIdentifier'
  }
}

class InvalidThinkingLevel extends Error {
  constructor(level: string) {
    super(`The thinking level ${level} is not off, low, medium or high.`)
    this.name = 'InvalidThinkingLevel'
  }
}
