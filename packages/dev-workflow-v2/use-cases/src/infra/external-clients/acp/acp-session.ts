import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import * as acp from '@agentclientprotocol/sdk'
import type { AcpSessionRequest } from './acp-client'

/** @riviere-role external-client-model */
export type AcpSessionOptions = {
  readonly command: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly onSpawned?: (child: ChildProcess) => void
}

/** @riviere-role external-client-model */
export type AcpSessionMessage =
  | {
      readonly kind: 'session_update'
      readonly update: {
        readonly sessionUpdate: string
        readonly content?: unknown
      }
    }
  | { readonly kind: 'stop' }

function isTextChunk(
  content: unknown,
): content is { readonly type: 'text'; readonly text: string } {
  return (
    typeof content === 'object' &&
    content !== null &&
    'type' in content &&
    content.type === 'text' &&
    'text' in content &&
    typeof content.text === 'string'
  )
}

/** @riviere-role external-client-service */
export async function runAcpSession(
  request: AcpSessionRequest,
  options: AcpSessionOptions,
): Promise<void> {
  const child = spawn(options.command, options.args, { stdio: ['pipe', 'pipe', 'inherit'] })
  options.onSpawned?.(child)
  const client = acp
    .client({ name: 'dev-workflow-v2-acp-client' })
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
      await context.buildSession(options.cwd).withSession(async (session) => {
        await session.prompt(request.prompt)
        await readResponse(session)
      })
    },
  )
}

/** @riviere-role external-client-service */
export async function readResponse(session: {
  nextUpdate(): Promise<AcpSessionMessage>
}): Promise<string> {
  const update = await session.nextUpdate()
  if (update.kind === 'stop') return ''
  const content = update.update.content
  if (update.update.sessionUpdate === 'agent_message_chunk' && isTextChunk(content))
    return content.text + (await readResponse(session))
  return readResponse(session)
}

/** @riviere-role external-client-service */
export function writableStream(stream: NodeJS.WritableStream): WritableStream<Uint8Array> {
  return new WritableStream({
    write(chunk) {
      stream.write(chunk)
    },
    close() {
      stream.end()
    },
  })
}

/** @riviere-role external-client-service */
export function readableStream(stream: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
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

/** @riviere-role external-client-service */
export async function readStdin(stdin: NodeJS.ReadableStream = process.stdin): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of stdin) chunks.push(String(chunk))
  return chunks.join('')
}
