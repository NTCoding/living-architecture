import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

/**
 * @riviere-role external-client-service
 */
export function createAskUserTool() {
  return createTool({
    id: 'ask-user',
    description: 'Ask the developer when you cannot decide alone.',
    inputSchema: z.object({ question: z.string(), evidence: z.string().nullable() }),
    outputSchema: z.object({ answer: z.string() }),
    suspendSchema: z.object({ question: z.string(), evidence: z.string().nullable() }),
    resumeSchema: z.object({ answer: z.string() }),
    execute: async ({ question, evidence }, context) => {
      const agentContext = context?.agent
      const answer = answerOf(agentContext?.resumeData)
      if (answer === null) return await agentContext?.suspend({ question, evidence })
      return answer
    },
  })
}

/**
 * Reads the answer the person gave when the run resumed.
 *
 * @riviere-role external-client-service
 */
export function answerOf(resumeData: unknown): { readonly answer: string } | null {
  if (typeof resumeData === 'object' && resumeData !== null && 'answer' in resumeData) {
    const answer: unknown = resumeData['answer']
    if (typeof answer === 'string') return { answer }
  }
  return null
}
