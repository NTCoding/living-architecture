import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

/**
 * @riviere-role agent-configuration
 */
export const askUser = createTool({
  id: 'ask-user',
  description: 'Ask the developer when you cannot decide alone.',
  inputSchema: z.object({ question: z.string(), evidence: z.string().nullable() }),
  outputSchema: z.object({ answer: z.string() }),
  suspendSchema: z.object({ question: z.string(), evidence: z.string().nullable() }),
  resumeSchema: z.object({ answer: z.string() }),
  execute: async ({ question, evidence }, context) => {
    const agentContext = context?.agent
    const resumeData = agentContext?.resumeData
    if (resumeData === undefined || !isAnswer(resumeData)) {
      return await agentContext?.suspend({ question, evidence })
    }
    return { answer: resumeData.answer }
  },
})

function isAnswer(value: unknown): value is { answer: string } {
  return typeof value === 'object' && value !== null && 'answer' in value
}
