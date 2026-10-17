/**
 * Check 4. A workspace beforeToolCall hook refuses an execute_command call by
 * returning proceed: false, and the agent receives the refusal as the tool
 * result. The refused command never runs.
 */
import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Agent } from '@mastra/core/agent'
import { Mastra } from '@mastra/core'
import { LocalSandbox, LocalFilesystem, Workspace, WORKSPACE_TOOLS } from '@mastra/core/workspace'
import { createResponderModel, hasToolResult } from './mock-model'

const workingDirectory = mkdtempSync(join(tmpdir(), 'spike-workspace-'))
const markerPath = join(workingDirectory, 'the-command-ran')
const refusals: string[] = []

const workspace = new Workspace({
  filesystem: new LocalFilesystem({ basePath: workingDirectory }),
  sandbox: new LocalSandbox({ workingDirectory }),
  tools: {
    hooks: {
      beforeToolCall: ({ toolName, input }) => {
        if (toolName !== WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND) return
        const command = (input as { command?: string }).command ?? ''
        if (!command.includes('git push')) return
        const refusal = 'Refused: the workflow pushes the branch, not you.'
        refusals.push(refusal)
        return { proceed: false, output: refusal }
      },
    },
  },
})

const model = createResponderModel((options) => {
  if (hasToolResult(options, WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND)) {
    return [{ type: 'text', text: 'understood, I will not push' }]
  }
  return [
    {
      type: 'tool-call',
      toolCallId: `call-${Date.now()}`,
      toolName: WORKSPACE_TOOLS.SANDBOX.EXECUTE_COMMAND,
      input: JSON.stringify({ command: `git push && touch ${markerPath}` }),
    },
  ]
})

const agent = new Agent({
  id: 'implementer',
  name: 'Implementer',
  instructions: 'Work in the workspace.',
  model: model as never,
  workspace,
})

async function main() {
  new Mastra({ agents: { implementer: agent }, logger: false as never })

  const result = await agent.generate('push the branch')
  console.log('text:', result.text)
  console.log('refusals:', JSON.stringify(refusals))
  console.log(
    'tool results:',
    JSON.stringify(result.toolResults.map((r) => r.payload.result).slice(0, 5)),
  )
  console.log('command ran:', existsSync(markerPath))

  if (refusals.length !== 1) throw new Error('the hook did not refuse the command')
  if (existsSync(markerPath)) throw new Error('the refused command still ran')
  if (!result.text.includes('will not push'))
    throw new Error('the agent did not receive the refusal')

  console.log(
    'CHECK 4 PASS: beforeToolCall refused the command with proceed: false, the agent saw the refusal, and nothing ran',
  )
}

void main()
