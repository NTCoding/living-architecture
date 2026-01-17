import { z } from 'zod'
import { github } from './github'

const formattedFeedbackItemSchema = z.object({
  threadId: z.string(),
  location: z.string(),
  author: z.string(),
  body: z.string(),
})
type FormattedFeedbackItem = z.infer<typeof formattedFeedbackItemSchema>

function formatFeedbackLocation(file?: string | null, line?: number | null): string {
  if (!file) {
    return 'PR-level'
  }
  if (!line) {
    return file
  }
  return `${file}:${line}`
}

export async function getUnresolvedPRFeedback(prNumber: number): Promise<FormattedFeedbackItem[]> {
  const feedback = await github.getUnresolvedFeedback(prNumber)

  return feedback.map((f) => ({
    threadId: f.threadId,
    location: formatFeedbackLocation(f.file, f.line),
    author: f.author,
    body: f.body,
  }))
}
