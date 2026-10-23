import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Agent } from '@mastra/core/agent'
import type { ToolsInput } from '@mastra/core/agent'
import { LibSQLStore } from '@mastra/libsql'
import { Memory } from '@mastra/memory'
import {
  agentRequestContextOf,
  AGENT_IDS,
  createAgents,
  MissingAgentContextValue,
} from './create-agent'
import type { AgentRequest } from './create-agent'
import { createAskUserTool } from './ask-user-tool'

const memory = new Memory({ storage: new LibSQLStore({ id: 'spec', url: ':memory:' }) })
const tools: ToolsInput = { 'ask-user': createAskUserTool() }

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
  it('registers one agent per factory name', () => {
    const agents = createAgents({ memory, tools })

    expect(Object.keys(agents)).toStrictEqual([...AGENT_IDS])
    expect(Object.values(agents).every((agent) => agent instanceof Agent)).toBe(true)
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
  it('resolves the request instructions from the context', async () => {
    const agents = createAgents({ memory, tools })

    const instructions = await agents.implementer.getInstructions({
      requestContext: agentRequestContextOf(aRequest({ instructions: 'carry the issue' })),
    })

    expect(instructions).toContain('carry the issue')
  })

  it('throws when the context carries no instructions', async () => {
    const agents = createAgents({ memory, tools })

    expect(() =>
      agents.implementer.getInstructions({ requestContext: new RequestContextShorn() }),
    ).toThrow('carries no usable value for "instructions"')
  })

  it('exposes the ask-user tool only when tools are on', async () => {
    const agents = createAgents({ memory, tools })

    const withTools = await agents['code-review'].getToolsForExecution({
      requestContext: agentRequestContextOf(aRequest({ useTools: true })),
    })
    const withoutTools = await agents['code-review'].getToolsForExecution({
      requestContext: agentRequestContextOf(aRequest({ useTools: false })),
    })

    expect(Object.keys(withTools)).toContain('ask-user')
    expect(Object.keys(withoutTools)).not.toContain('ask-user')
  })

  it('throws when the context carries no useTools flag', async () => {
    const agents = createAgents({ memory, tools })

    await expect(
      agents['code-review'].getToolsForExecution({ requestContext: new RequestContextShorn() }),
    ).rejects.toThrow('carries no usable value for "useTools"')
  })

  it('builds a workspace over the request worktree and none without one', async () => {
    const agents = createAgents({ memory, tools })
    const worktree = mkdtempSync(join(tmpdir(), 'factory-agent-'))

    const withWorkspace = await agents.implementer.getWorkspace({
      requestContext: agentRequestContextOf(
        aRequest({ workspacePath: worktree, workspaceWritable: true }),
      ),
    })
    const withoutWorkspace = await agents.implementer.getWorkspace({
      requestContext: agentRequestContextOf(aRequest()),
    })

    expect(withoutWorkspace).toBeUndefined()
    expect(withWorkspace).toBeDefined()
  })

  it('throws when the context workspace path is neither null nor a string', async () => {
    const agents = createAgents({ memory, tools })

    await expect(
      agents.implementer.getWorkspace({ requestContext: new RequestContextShorn() }),
    ).rejects.toThrow(MissingAgentContextValue)
  })
})

class RequestContextShorn {
  get(): undefined {
    return undefined
  }
}
