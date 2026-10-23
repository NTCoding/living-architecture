import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Agent } from '@mastra/core/agent'
import type { ToolsInput } from '@mastra/core/agent'
import { LibSQLStore } from '@mastra/libsql'
import { Memory } from '@mastra/memory'
import { createAgentFactory } from './create-agent'
import { createAskUserTool } from './ask-user-tool'

const memory = new Memory({ storage: new LibSQLStore({ id: 'spec', url: ':memory:' }) })
const tools: ToolsInput = { 'ask-user': createAskUserTool() }

describe('createAgentFactory', () => {
  it('creates an agent with the request name and instructions and no tools when tools are off', async () => {
    const agentFor = createAgentFactory({ memory, tools })

    const agent = agentFor({
      id: 'implementer',
      model: 'zai/glm-5.3-flash',
      instructions: 'carry the issue',
      workspacePath: null,
      useTools: false,
      workspaceWritable: false,
    })

    expect(agent).toBeInstanceOf(Agent)
    expect(agent.name).toBe('implementer')
    expect(Object.keys(await agent.getToolsForExecution({}))).not.toContain('ask-user')
  })

  it('creates an agent with tools when tools are on', async () => {
    const agentFor = createAgentFactory({ memory, tools })

    const agent = agentFor({
      id: 'code-review',
      model: 'zai/glm-5.3-flash',
      instructions: 'review the change',
      workspacePath: null,
      useTools: true,
      workspaceWritable: false,
    })

    expect(agent).toBeInstanceOf(Agent)
    expect(agent.name).toBe('code-review')
    expect(Object.keys(await agent.getToolsForExecution({}))).toContain('ask-user')
  })

  it('creates an agent with a workspace when a worktree path is given', () => {
    const agentFor = createAgentFactory({ memory, tools })
    const worktree = mkdtempSync(join(tmpdir(), 'factory-agent-'))

    const agent = agentFor({
      id: 'implementer',
      model: 'zai/glm-5.3-flash',
      instructions: 'carry the issue',
      workspacePath: worktree,
      useTools: false,
      workspaceWritable: true,
    })

    expect(agent).toBeInstanceOf(Agent)
    expect(agent.name).toBe('implementer')
  })
})
