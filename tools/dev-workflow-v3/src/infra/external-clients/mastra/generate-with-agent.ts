import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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
export interface AgentGenerationOptions {
  readonly maxSteps: number
  readonly modelSettings: { readonly reasoning: 'none' | 'low' | 'medium' | 'high' }
  readonly abortSignal: AbortSignal
  readonly memory?: { readonly thread: string; readonly resource: string }
  readonly autoResumeSuspendedTools?: boolean
  readonly structuredOutput?: { readonly schema: z.ZodType<unknown>; readonly model: string }
}

/** @riviere-role external-client-model */
export interface AgentGenerationResult {
  readonly object?: unknown
  readonly text: string
  readonly finishReason: unknown
  readonly suspendPayload?: unknown
}

/** @riviere-role external-client-model */
export interface GeneratingAgent {
  readonly generate: (
    prompt: string,
    options: AgentGenerationOptions,
  ) => Promise<AgentGenerationResult>
}

/** @riviere-role external-client-model */
export interface AgentGeneration {
  readonly object: unknown
  readonly text: string
  readonly finishReason: string
  readonly suspendPayload: unknown
}

/** @riviere-role external-client-model */
export interface FailedProviderRequest {
  readonly timestamp: string
  readonly agentId: string
  readonly model: string
  readonly thinking: string
  readonly requestBody: unknown
  readonly note?: string
}

function conversationOptions(request: AgentGenerationRequest) {
  return {
    maxSteps: request.maxSteps,
    modelSettings: { reasoning: reasoningLevelOf(request.thinking) },
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
  readonly agentFor: (request: AgentRequest) => GeneratingAgent
}): (request: AgentGenerationRequest) => Promise<AgentGeneration> {
  return async (request) => generateWithRetry(dependencies, request, 0)
}

function isEmptyAnswer(response: AgentGeneration): boolean {
  return (
    response.finishReason === 'stop' && response.text.trim() === '' && response.object === undefined
  )
}

async function generateWithRetry(
  dependencies: { readonly agentFor: (request: AgentRequest) => GeneratingAgent },
  request: AgentGenerationRequest,
  attempt: number,
): Promise<AgentGeneration> {
  const response = await generateOnce(dependencies, request)
  if (!isEmptyAnswer(response) || attempt >= 2) return response
  return generateWithRetry(dependencies, request, attempt + 1)
}

async function generateOnce(
  dependencies: { readonly agentFor: (request: AgentRequest) => GeneratingAgent },
  request: AgentGenerationRequest,
): Promise<AgentGeneration> {
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
    if (!abort.signal.aborted) {
      captureFailedRequest(request, error)
      throw error
    }
    return { object: undefined, text: '', finishReason: 'aborted', suspendPayload: null }
  } finally {
    clearTimeout(timer)
  }
}

function reasoningLevelOf(level: string): 'none' | 'low' | 'medium' | 'high' {
  if (level === 'off') return 'none'
  if (level === 'low' || level === 'medium' || level === 'high') return level
  throw new InvalidThinkingLevel(level)
}

/**
 * Builds the record persisted when a model provider rejects a request. The AI SDK carries the
 * complete rejected request body on `requestBodyValues` of an `APICallError`; without this record
 * the evidence is lost, because nothing is persisted before a failed generation ends.
 *
 * @riviere-role external-client-service
 */
export function failedProviderRequestOf(
  request: AgentGenerationRequest,
  error: unknown,
  timestamp: string,
): FailedProviderRequest {
  const body = requestBodyValuesOf(error)
  return {
    timestamp,
    agentId: request.agentId,
    model: request.model,
    thinking: request.thinking,
    requestBody: body,
    ...(body === null ? { note: 'The request body was not available on the error.' } : {}),
  }
}

function requestBodyValuesOf(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'requestBodyValues' in error) {
    const body: unknown = error['requestBodyValues']
    return body === undefined ? null : body
  }
  return null
}

function captureFailedRequest(request: AgentGenerationRequest, error: unknown): void {
  const directory = `${process.cwd()}/.factory/logs`
  const record = failedProviderRequestOf(request, error, new Date().toISOString())
  mkdirSync(directory, { recursive: true })
  writeFileSync(
    join(directory, `${request.agentId}-failed-request.json`),
    JSON.stringify(record, null, 2),
  )
}

/** @riviere-role external-client-error */
class InvalidThinkingLevel extends Error {
  constructor(level: string) {
    super(`The thinking level ${level} is not off, low, medium or high.`)
    this.name = 'InvalidThinkingLevel'
  }
}
