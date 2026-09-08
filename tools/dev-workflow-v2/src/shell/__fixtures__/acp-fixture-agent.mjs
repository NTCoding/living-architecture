import { createInterface } from 'node:readline'
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk'

const reviewPayload = process.env.ACP_FIXTURE_REVIEW ?? '{"verdict":"PASS","findings":[]}'
const protocolVersion =
  process.env.ACP_FIXTURE_PROTOCOL_VERSION === undefined
    ? PROTOCOL_VERSION
    : Number(process.env.ACP_FIXTURE_PROTOCOL_VERSION)
const hangOnPrompt = process.env.ACP_FIXTURE_HANG === 'true'
const sessionId = 'fixture-session'

const rl = createInterface({ input: process.stdin })

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

rl.on('line', (line) => {
  const message = JSON.parse(line)
  if (message.method === 'initialize') {
    send({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion,
        agentCapabilities: {},
        agentInfo: { name: 'fixture-agent', version: '1.0.0' },
      },
    })
    return
  }
  if (message.method === 'session/new') {
    send({
      jsonrpc: '2.0',
      id: message.id,
      result: { sessionId },
    })
    return
  }
  if (message.method === 'session/prompt') {
    if (hangOnPrompt) return
    send({
      jsonrpc: '2.0',
      method: 'session/update',
      params: {
        sessionId,
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: reviewPayload },
        },
      },
    })
    send({
      jsonrpc: '2.0',
      id: message.id,
      result: { stopReason: 'end_turn' },
    })
    return
  }
  throw new Error(`Unexpected ACP method: ${message.method}`)
})