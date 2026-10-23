import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Agent } from '@mastra/core/agent'
import type { ToolsInput } from '@mastra/core/agent'
import { RequestContext } from '@mastra/core/request-context'
import { LibSQLStore } from '@mastra/libsql'
import { Memory } from '@mastra/memory'
import {
  agentFrom,
  agentRequestContextOf,
  createAgents,
  MissingAgentContextValue,
  UnregisteredAgent,
} from './create-agent'
import type { AgentRequest } from './create-agent'
import { createAskUserTool } from './ask-user-tool'

const memory = new Memory({ storage: new LibSQLStore({ id: 'spec', url: ':memory:' }) })
const tools: ToolsInput = { 'ask-user': createAskUserTool() }
const AGENT_NAMES = [
  'planner',
  'implementer',
  'pull-request-writer',
  'architecture-review',
  'code-review',
  'bug-scanner',
] as const

function aRequest(overrides?: Partial<AgentRequest>): AgentRequest {
  return {
    id: 'implementer',
    model: 'zai/glm-5.3-flash',
    instructions: 'carry the issue',
    workspacePath: null,
    useTools: false,
    workspaceWritable: false,
    ...overrides,
  }
}

describe('createAgents', () => {
  it('registers one agent per given name', () => {
    const agents = createAgents({ memory, tools, agentNames: [...AGENT_NAMES] })

    expect(Object.keys(agents).sort((first, second) => first.localeCompare(second))).toStrictEqual(
      [...AGENT_NAMES].sort((first, second) => first.localeCompare(second)),
    )
    expect(Object.values(agents).every((agent) => agent instanceof Agent)).toBe(true)
  })
})

describe('agentFrom', () => {
  it('resolves a registered agent name', () => {
    const agents = createAgents({ memory, tools, agentNames: ['implementer'] })

    expect(agentFrom(agents, 'implementer').name).toBe('implementer')
  })

  it('rejects a name no registry carries', () => {
    const agents = createAgents({ memory, tools, agentNames: ['implementer'] })

    expect(() => agentFrom(agents, 'not-registered')).toThrow(UnregisteredAgent)
  })
})

describe('agentRequestContextOf', () => {
  it('carries every request value the registered agents resolve their config from', () => {
    const worktree = mkdtempSync(join(tmpdir(), 'factory-agent-'))
    const context = agentRequestContextOf(
      aRequest({ workspacePath: worktree, useTools: true, workspaceWritable: true }),
    )

    expect(context.get('model')).toBe('zai/glm-5.3-flash')
    expect(context.get('instructions')).toBe('carry the issue')
    expect(context.get('workspacePath')).toBe(worktree)
    expect(context.get('useTools')).toBe(true)
  })

  it('carries a null workspace path as null', () => {
    const context = agentRequestContextOf(aRequest())

    expect(context.get('workspacePath')).toBeNull()
  })
})

describe('registered agents', () => {
  it('resolves the request instructions from the context', () => {
    const agents = createAgents({ memory, tools, agentNames: [...AGENT_NAMES] })

    const instructions = agents['implementer']?.getInstructions({
      requestContext: agentRequestContextOf(aRequest({ instructions: 'carry the issue' })),
    })

    expect(instructions).toContain('carry the issue')
  })

  it('throws when the context carries no instructions', () => {
    const agents = createAgents({ memory, tools, agentNames: [...AGENT_NAMES] })

    expect(() =>
      agents['implementer']?.getInstructions({ requestContext: new RequestContext() }),
    ).toThrow('carries no usable value for "instructions"')
  })

  it('exposes the ask-user tool only when tools are on', async () => {
    const agents = createAgents({ memory, tools, agentNames: [...AGENT_NAMES] })
    const reviewer = agentFrom(agents, 'code-review')

    const withTools = await reviewer.getToolsForExecution({
      requestContext: agentRequestContextOf(aRequest({ useTools: true })),
    })
    const withoutTools = await reviewer.getToolsForExecution({
      requestContext: agentRequestContextOf(aRequest({ useTools: false })),
    })

    expect(Object.keys(withTools)).toContain('ask-user')
    expect(Object.keys(withoutTools)).not.toContain('ask-user')
  })

  it('throws when the context carries no useTools flag', async () => {
    const agents = createAgents({ memory, tools, agentNames: [...AGENT_NAMES] })
    const reviewer = agentFrom(agents, 'code-review')

    await expect(
      reviewer.getToolsForExecution({ requestContext: new RequestContext() }),
    ).rejects.toThrow('carries no usable value for "useTools"')
  })

  it('builds a workspace over the request worktree and none without one', async () => {
    const agents = createAgents({ memory, tools, agentNames: [...AGENT_NAMES] })
    const worktree = mkdtempSync(join(tmpdir(), 'factory-agent-'))
    const implementer = agentFrom(agents, 'implementer')

    const withWorkspace = await implementer.getWorkspace({
      requestContext: agentRequestContextOf(
        aRequest({ workspacePath: worktree, workspaceWritable: true }),
      ),
    })
    const withoutWorkspace = await implementer.getWorkspace({
      requestContext: agentRequestContextOf(aRequest()),
    })

    expect(withoutWorkspace).toBeUndefined()
    expect(withWorkspace).toBeDefined()
  })

  it('throws when the context workspace path is neither null nor a string', async () => {
    const agents = createAgents({ memory, tools, agentNames: [...AGENT_NAMES] })
    const implementer = agentFrom(agents, 'implementer')

    await expect(
      implementer.getWorkspace({ requestContext: new RequestContext() }),
    ).rejects.toThrow(MissingAgentContextValue)
  })
})
