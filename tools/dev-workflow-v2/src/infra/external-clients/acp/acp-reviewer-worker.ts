import { spawn } from 'node:child_process'
import * as acp from '@agentclientprotocol/sdk'
import { z } from 'zod'

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
const input = inputSchema.parse(JSON.parse(await readStdin()))
await Promise.all(input.requests.map((request) => runReviewer(request)))

async function readResponse(session: acp.ActiveSession): Promise<string> {
  const update = await session.nextUpdate()
  if (update.kind === 'stop') return ''
  if (
    update.update.sessionUpdate === 'agent_message_chunk' &&
    update.update.content.type === 'text'
  )
    return update.update.content.text + (await readResponse(session))
  return readResponse(session)
}

async function runReviewer(request: (typeof input.requests)[number]): Promise<void> {
  const child = spawn(input.command, input.args, { stdio: ['pipe', 'pipe', 'inherit'] })
  const client = acp
    .client({ name: 'dev-workflow-v2-review-launcher' })
    .onRequest(acp.methods.client.session.requestPermission, () => ({
      outcome: { outcome: 'cancelled' as const },
    }))
    .onRequest(acp.methods.client.fs.readTextFile, () => ({ content: '' }))
    .onRequest(acp.methods.client.fs.writeTextFile, () => ({}))
  await client.connectWith(
    acp.ndJsonStream(writableStream(child.stdin), readableStream(child.stdout)),
    async (context) => {
      await context.request(acp.methods.agent.initialize, {
        protocolVersion: acp.PROTOCOL_VERSION,
        clientCapabilities: { fs: { readTextFile: true, writeTextFile: true } },
      })
      await context.buildSession(process.cwd()).withSession(async (session) => {
        await session.prompt(
          `Review pull request #${String(request.pullRequestNumber)} as ${request.reviewer}. ` +
            'Review the changed code on GitHub and post all feedback as inline comments. ' +
            `Prefix every comment with [${request.reviewer}]. ` +
            'When all your feedback is resolved, post a GitHub comment containing ' +
            `[${request.reviewer}] APPROVED. Do not return findings or a verdict to the caller.`,
        )
        await readResponse(session)
      })
    },
  )
}

function writableStream(stream: NodeJS.WritableStream): WritableStream<Uint8Array> {
  return new WritableStream({
    write(chunk) {
      stream.write(chunk)
    },
    close() {
      stream.end()
    },
  })
}

function readableStream(stream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: Uint8Array | string) =>
        controller.enqueue(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk),
      )
      stream.on('end', () => controller.close())
      stream.on('error', (error: Error) => controller.error(error))
    },
  })
}

async function readStdin(): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of process.stdin) chunks.push(String(chunk))
  return chunks.join('')
}
