import { z } from 'zod'
import { github } from './github'

const feedbackItemSchema = z.object({
  threadId: z.string(),
  file: z.string().nullish(),
  line: z.number().nullish(),
  author: z.string(),
  body: z.string(),
})

export const formattedFeedbackItemSchema = z.object({
  threadId: z.string(),
  location: z.string(),
  author: z.string(),
  body: z.string(),
})
export type FormattedFeedbackItem = z.infer<typeof formattedFeedbackItemSchema>

function formatFeedbackLocation(file?: string | null, line?: number | null): string {
  if (!file) {
    return 'PR-level'
  }
  if (line == null) {
    return file
  }
  return `${file}:${line}`
}

export async function getPRFeedback(
  prNumber: number,
  options: { includeResolved?: boolean } = {},
): Promise<FormattedFeedbackItem[]> {
  const rawFeedback = await github.getFeedback(prNumber, options)
  const feedback = z.array(feedbackItemSchema).parse(rawFeedback)

  return feedback.map((f) => ({
    threadId: f.threadId,
    location: formatFeedbackLocation(f.file, f.line),
    author: f.author,
    body: f.body,
  }))
}
