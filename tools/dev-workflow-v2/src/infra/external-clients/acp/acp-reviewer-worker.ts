import { z } from 'zod'
import { runAcpReviewSession, readStdin } from './acp-review-session'

const inputSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  requests: z.array(
    z.object({
      reviewer: z.enum(['architecture-review', 'code-review', 'bug-scanner', 'task-check']),
      pullRequestNumber: z.number().int().positive(),
      workflowState: z.unknown(),
    }),
  ),
})

/** @riviere-role external-client-service */
export async function runReviewWorker(input: unknown, cwd: string): Promise<void> {
  const parsed = inputSchema.parse(input)
  await Promise.all(
    parsed.requests.map((request) =>
      runAcpReviewSession(request, {
        command: parsed.command,
        args: parsed.args,
        cwd,
      }),
    ),
  )
}

const input: unknown = JSON.parse(await readStdin())
await runReviewWorker(input, process.cwd())
