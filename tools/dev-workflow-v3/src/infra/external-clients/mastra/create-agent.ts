import { Agent } from '@mastra/core/agent'
import type { ToolsInput } from '@mastra/core/agent'
import type { Memory } from '@mastra/memory'
import { RequestContext } from '@mastra/core/request-context'
import type { IdentifiedModelConfig, OpenAICompatibleConfig } from '@mastra/core/llm'
import { createWorkspace } from './create-workspace'

const OPENCODE_PROVIDER_PREFIX = 'opencode-go/'
const OPENCODE_INFERENCE_URL = 'https://opencode.ai/inference/go/v1'
const OPENCODE_SESSION_HEADER = 'x-opencode-session'

/** @riviere-role external-client-model */
export interface AgentRequest {
  readonly id: string
  readonly model: string
  readonly instructions: string
  readonly workspacePath: string | null
  readonly threadId: string | null
  readonly useTools: boolean
  readonly workspaceWritable: boolean
}

/**
 * Builds the per-call request context the registered agents resolve their model, instructions,
 * tools and workspace from, so one registered agent per name serves every generation request.
 *
 * @riviere-role external-client-service
 */
export function agentRequestContextOf(request: AgentRequest): RequestContext {
  const context = new RequestContext()
  context.set('model', request.model)
  context.set('instructions', request.instructions)
  context.set('workspacePath', request.workspacePath)
  context.set('threadId', request.threadId)
  context.set('useTools', request.useTools)
  context.set('workspaceWritable', request.workspaceWritable)
  return context
}

/**
 * Registers one agent per given name on the Mastra instance, so the Studio can show the agents,
 * their threads and their transcripts, and so every model call joins the workflow trace and
 * records its token usage. The names come from the caller; this wiring carries no knowledge of
 * which agents the factory employs.
 *
 * @riviere-role external-client-service
 */
export function createAgents(dependencies: {
  readonly memory: Memory
  readonly tools: ToolsInput
  readonly agentNames: readonly string[]
}): Record<string, Agent> {
  return Object.fromEntries(
    dependencies.agentNames.map((name) => [name, registeredAgent(name, dependencies)]),
  )
}

/**
 * Resolves a generation request's agent name against the registered agents, so an unknown name
 * fails before any provider call.
 *
 * @riviere-role external-client-service
 */
export function agentFrom(agents: Record<string, Agent>, name: string): Agent {
  const agent = agents[name]
  if (agent === undefined) throw new UnregisteredAgent(name)
  return agent
}

/** @riviere-role external-client-error */
export class UnregisteredAgent extends Error {
  constructor(agentId: string) {
    super(`No agent is registered under "${agentId}".`)
    this.name = 'UnregisteredAgent'
  }
}

function registeredAgent(
  name: string,
  dependencies: { readonly memory: Memory; readonly tools: ToolsInput },
): Agent {
  return new Agent({
    id: name,
    name,
    instructions: ({ requestContext }) => requiredString(requestContext, 'instructions'),
    model: ({ requestContext }) => generationModelOf(requestContext),
    tools: ({ requestContext }) =>
      requiredBoolean(requestContext, 'useTools') ? dependencies.tools : {},
    memory: dependencies.memory,
    workspace: ({ requestContext }) => workspaceOf(requestContext),
  })
}

/**
 * Resolves the request's model for Mastra's agent. OpenCode requests carry the memory thread id
 * as a session header so the provider routes a run's calls as one session; every other provider
 * keeps its model string untouched.
 *
 * @riviere-role external-client-service
 */
export function generationModelOf(
  requestContext: RequestContext | undefined,
): IdentifiedModelConfig {
  const model = requiredString(requestContext, 'model')
  return { model: serializableGenerationModelOf(requestContext), id: model }
}

/**
 * Resolves the model for settings that must survive serialization, such as structured output.
 *
 * @riviere-role external-client-service
 */
export function serializableGenerationModelOf(
  requestContext: RequestContext | undefined,
): OpenAICompatibleConfig {
  const model = requiredString(requestContext, 'model')
  return serializableModelConfigOf(model, requiredStringOrNull(requestContext, 'threadId'))
}

/**
 * Resolves a model string for callers outside the request lifecycle, whose own session id stands
 * in for the memory thread.
 *
 * @riviere-role external-client-service
 */
export function serializableModelConfigOf(
  model: string,
  session: string | null,
): OpenAICompatibleConfig {
  return opencodeConfigOf(model, session) ?? routedModelConfigOf(model)
}

function routedModelConfigOf(model: string): OpenAICompatibleConfig {
  const separator = model.indexOf('/')
  if (separator === -1) throw new UnroutedModelId(model)
  return { providerId: model.slice(0, separator), modelId: model.slice(separator + 1) }
}

function opencodeConfigOf(model: string, session: string | null): OpenAICompatibleConfig | null {
  if (!model.startsWith(OPENCODE_PROVIDER_PREFIX)) return null
  if (session === null) throw new MissingThreadForOpenCodeSession()
  return {
    providerId: 'opencode-go',
    modelId: model.slice(OPENCODE_PROVIDER_PREFIX.length),
    url: OPENCODE_INFERENCE_URL,
    apiKey: openCodeApiKey(),
    headers: { [OPENCODE_SESSION_HEADER]: session },
  }
}

function openCodeApiKey(): string {
  const apiKey = process.env['OPENCODE_API_KEY']
  if (apiKey === undefined || apiKey === '') throw new MissingOpenCodeApiKey()
  return apiKey
}

function workspaceOf(requestContext: RequestContext) {
  const workspacePath = requiredStringOrNull(requestContext, 'workspacePath')
  if (workspacePath === null) return undefined
  return createWorkspace(workspacePath, {
    readOnly: !requiredBoolean(requestContext, 'workspaceWritable'),
  })
}

function requiredString(requestContext: RequestContext | undefined, key: string): string {
  const value = requestContext?.get(key)
  if (typeof value !== 'string' || value === '') throw new MissingAgentContextValue(key)
  return value
}

function requiredStringOrNull(
  requestContext: RequestContext | undefined,
  key: string,
): string | null {
  const value = requestContext?.get(key)
  if (value === null) return null
  if (typeof value !== 'string' || value === '') throw new MissingAgentContextValue(key)
  return value
}

function requiredBoolean(requestContext: RequestContext | undefined, key: string): boolean {
  const value = requestContext?.get(key)
  if (typeof value !== 'boolean') throw new MissingAgentContextValue(key)
  return value
}

/** @riviere-role external-client-error */
export class MissingOpenCodeApiKey extends Error {
  constructor() {
    super('Could not find API key process.env.OPENCODE_API_KEY for model id opencode-go/.')
    this.name = 'MissingOpenCodeApiKey'
  }
}

/** @riviere-role external-client-error */
export class MissingThreadForOpenCodeSession extends Error {
  constructor() {
    super('OpenCode requests need a memory thread id to route as a stable session.')
    this.name = 'MissingThreadForOpenCodeSession'
  }
}

/** @riviere-role external-client-error */
export class UnroutedModelId extends Error {
  constructor(model: string) {
    super(`The model id "${model}" carries no provider route prefix such as "opencode-go/".`)
    this.name = 'UnroutedModelId'
  }
}

/** @riviere-role external-client-error */
export class MissingAgentContextValue extends Error {
  constructor(key: string) {
    super(`The agent request context carries no usable value for "${key}".`)
    this.name = 'MissingAgentContextValue'
  }
}
