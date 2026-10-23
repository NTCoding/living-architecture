import { Agent } from '@mastra/core/agent'
import type { ToolsInput } from '@mastra/core/agent'
import type { Memory } from '@mastra/memory'
import { ToolCallFilter } from '@mastra/core/processors'
import { RequestContext } from '@mastra/core/request-context'
import { createWorkspace } from './create-workspace'
import { ProviderMessageSanitizer } from './provider-message-sanitizer'
import { TaskPreservingTokenLimiter } from './task-preserving-token-limiter'

/**
 * The implementer works one issue on one thread that only grows, and the reviewers read a whole
 * change. Both would eventually hand the model more than it can hold. This budget keeps a long
 * coding session in the prompt while leaving room, inside a 200k context, for the instructions,
 * the workspace description and the answer.
 */
const CONVERSATION_TOKEN_BUDGET = 120_000

/**
 * The agent needs the most recent tool exchanges to choose its next command. Older exchanges are
 * finished work: they stay in the stored thread but leave the prompt, so a long session keeps its
 * prefix stable for provider caching instead of swelling toward the budget.
 */
const RECENT_TOOL_STEPS_KEPT = 3

const AGENT_IDS = [
  'planner',
  'implementer',
  'pull-request-writer',
  'architecture-review',
  'code-review',
  'bug-scanner',
] as const

/** @riviere-role external-client-model */
export type AgentId = (typeof AGENT_IDS)[number]

/** @riviere-role external-client-model */
export interface AgentRequest {
  readonly id: AgentId
  readonly model: string
  readonly instructions: string
  readonly workspacePath: string | null
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
  context.set('useTools', request.useTools)
  context.set('workspaceWritable', request.workspaceWritable)
  return context
}

/**
 * Registers one agent per name on the Mastra instance, so the Studio can show the agents, their
 * threads and their transcripts, and so every model call joins the workflow trace and records its
 * token usage.
 *
 * @riviere-role external-client-service
 */
export function createAgents(dependencies: {
  readonly memory: Memory
  readonly tools: ToolsInput
}): Record<AgentId, Agent> {
  return {
    planner: registeredAgent('planner', dependencies),
    implementer: registeredAgent('implementer', dependencies),
    'pull-request-writer': registeredAgent('pull-request-writer', dependencies),
    'architecture-review': registeredAgent('architecture-review', dependencies),
    'code-review': registeredAgent('code-review', dependencies),
    'bug-scanner': registeredAgent('bug-scanner', dependencies),
  }
}

/**
 * Resolves a generation request's agent name against the registered agent names, so an unknown
 * name fails before any provider call.
 *
 * @riviere-role external-client-service
 */
export function agentIdOf(value: string): AgentId {
  const found = AGENT_IDS.find((id) => id === value)
  if (found === undefined) throw new UnregisteredAgent(value)
  return found
}

/** @riviere-role external-client-error */
export class UnregisteredAgent extends Error {
  constructor(agentId: string) {
    super(`No agent is registered under "${agentId}".`)
    this.name = 'UnregisteredAgent'
  }
}

function registeredAgent(
  id: AgentId,
  dependencies: {
    readonly memory: Memory
    readonly tools: ToolsInput
  },
): Agent {
  return new Agent({
    id,
    name: id,
    instructions: ({ requestContext }) => requiredString(requestContext, 'instructions'),
    model: ({ requestContext }) => requiredString(requestContext, 'model'),
    tools: ({ requestContext }) =>
      requiredBoolean(requestContext, 'useTools') ? dependencies.tools : {},
    memory: dependencies.memory,
    inputProcessors: [
      new ToolCallFilter({
        preserveModelOutput: true,
        filterAfterToolSteps: RECENT_TOOL_STEPS_KEPT,
      }),
      new TaskPreservingTokenLimiter({ limit: CONVERSATION_TOKEN_BUDGET }),
      new ProviderMessageSanitizer(),
    ],
    workspace: ({ requestContext }) => workspaceOf(requestContext),
  })
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
export class MissingAgentContextValue extends Error {
  constructor(key: string) {
    super(`The agent request context carries no usable value for "${key}".`)
    this.name = 'MissingAgentContextValue'
  }
}
