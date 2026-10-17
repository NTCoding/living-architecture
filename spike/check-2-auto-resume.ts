/**
 * Check 2. autoResumeSuspendedTools resumes a suspended tool from the next
 * chat message, and listSuspendedRuns() finds the waiting run again.
 *
 * The model is a mock, so this check proves Mastra's suspension plumbing, not
 * an answer from a real provider. On the second message the mock follows the
 * auto-resume instruction Mastra adds to the system message: it calls the same
 * tool again, carrying resumeData and the suspendedToolCallId.
 */
import { Agent } from '@mastra/core/agent'
import { Mastra } from '@mastra/core'
import { createTool } from '@mastra/core/tools'
import { Memory } from '@mastra/memory'
import { LibSQLStore } from '@mastra/libsql'
import { z } from 'zod'
import { createResponderModel, hasToolResult } from './mock-model'

const resumeAnswers: string[] = []
const suspendedToolCallIds: string[] = []
let firstCallId = ''

const askUser = createTool({
  id: 'ask-user',
  description: 'Ask the developer when you cannot decide alone.',
  inputSchema: z.object({ question: z.string(), evidence: z.string().nullable() }),
  outputSchema: z.object({ answer: z.string() }),
  suspendSchema: z.object({ question: z.string(), evidence: z.string().nullable() }),
  resumeSchema: z.object({ answer: z.string() }),
  execute: async ({ question, evidence }, context) => {
    const agentContext = context?.agent
    const resumeData = agentContext?.resumeData as { answer: string } | undefined
    const suspend = agentContext?.suspend as ((payload: unknown) => Promise<never>) | undefined
    if (!resumeData) {
      firstCallId = `call-${Date.now()}`
      if (!suspend) throw new Error('no suspend function on the tool context')
      return await suspend({ question, evidence })
    }
    resumeAnswers.push(resumeData.answer)
    suspendedToolCallIds.push(firstCallId)
    return { answer: resumeData.answer }
  },
})

const model = createResponderModel((options) => {
  const prompt = JSON.stringify(options.prompt)
  if (hasToolResult(options, 'ask-user')) return [{ type: 'text', text: 'ok, wiring it up now' }]
  if (prompt.includes('Analyse the suspended tools')) {
    return [
      {
        type: 'tool-call',
        toolCallId: `call-resume-${Date.now()}`,
        toolName: 'ask-user',
        input: JSON.stringify({
          question: 'reuse assertSchemaConforms, or add a second port?',
          evidence: null,
          suspendedToolCallId: firstCallId,
          resumeData: { answer: 'reuse it' },
        }),
      },
    ]
  }
  return [
    {
      type: 'tool-call',
      toolCallId: `call-${Date.now()}`,
      toolName: 'ask-user',
      input: JSON.stringify({
        question: 'reuse assertSchemaConforms, or add a second port?',
        evidence: null,
      }),
    },
  ]
})

const storage = new LibSQLStore({ id: 'spike-store', url: ':memory:' })

const agent = new Agent({
  id: 'implementer',
  name: 'Implementer',
  instructions: 'Ask the developer when you cannot decide alone.',
  model: model as never,
  tools: { askUser },
  memory: new Memory({ storage }),
  defaultOptions: { autoResumeSuspendedTools: true },
})

async function main() {
  new Mastra({ agents: { implementer: agent }, storage, logger: false as never })

  const thread = { thread: 'issue-455', resource: 'living-architecture' }
  const first = await agent.generate('implement the issue', { memory: thread })
  console.log('first finish reason:', first.finishReason)
  if (first.finishReason !== 'suspended') throw new Error('expected the first call to suspend')

  const suspended = await agent.listSuspendedRuns({
    threadId: thread.thread,
    resourceId: thread.resource,
  })
  console.log('suspended runs found:', suspended.runs.length)
  if (suspended.runs.length !== 1) throw new Error('expected one suspended run')

  const second = await agent.generate('reuse it', { memory: thread })
  console.log('second finish reason:', second.finishReason)
  console.log('second text:', second.text)
  console.log('answers the tool received:', JSON.stringify(resumeAnswers))

  if (resumeAnswers[0] !== 'reuse it')
    throw new Error('the tool was not resumed with the chat answer')
  if (!second.text.includes('wiring it up'))
    throw new Error('the agent did not carry on after the resume')

  const after = await agent.listSuspendedRuns({
    threadId: thread.thread,
    resourceId: thread.resource,
  })
  console.log('suspended runs after the resume:', after.runs.length)
  console.log(
    'run after the resume:',
    JSON.stringify(
      after.runs.map((r) => ({ ...r, toolCalls: r.toolCalls.map((c) => c.toolName) })),
      null,
      2,
    ),
  )

  console.log(
    'CHECK 2 PASS: the next chat message resumed the suspended tool, and the run was found with listSuspendedRuns()',
  )
}

void main()
