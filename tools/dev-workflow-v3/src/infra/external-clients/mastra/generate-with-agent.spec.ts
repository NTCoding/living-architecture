import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  createAgentGeneration,
  failedProviderRequestOf,
  type AgentGenerationRequest,
  type AgentGenerationResult,
  type AgentGenerationOptions,
  type GeneratingAgent,
} from './generate-with-agent'

/** A provider rejection like the AI SDK `APICallError`, carrying the rejected request body. */
class RejectedProviderRequest extends Error {
  readonly requestBodyValues: unknown

  constructor(message: string, requestBodyValues?: unknown) {
    super(message)
    this.name = 'RejectedProviderRequest'
    this.requestBodyValues = requestBodyValues
  }
}

function aRequest(overrides?: Partial<AgentGenerationRequest>): AgentGenerationRequest {
  return {
    agentId: 'implementer',
    model: 'zai/glm-5.3-flash',
    thinking: 'high',
    instructions: 'carry the issue',
    prompt: 'please implement issue 564',
    workspacePath: null,
    threadId: null,
    useTools: false,
    workspaceWritable: false,
    responseSchema: null,
    maxSteps: 5,
    timeBudgetMs: 1_000,
    ...overrides,
  }
}

type GenerateCall = { readonly prompt: string; readonly options: AgentGenerationOptions }

function agentWithResponseQueue(responses: readonly (AgentGenerationResult | Error)[]): {
  readonly agent: GeneratingAgent
  readonly calls: GenerateCall[]
} {
  const calls: GenerateCall[] = []
  const queue = [...responses]
  const agent: GeneratingAgent = {
    generate: async (prompt: string, options: AgentGenerationOptions) => {
      calls.push({ prompt, options })
      const next = queue.shift()
      if (next instanceof Error) throw next
      if (next === undefined) throw new ProviderCrashed('The test ran out of queued responses.')
      return next
    },
  }
  return { agent, calls }
}

class ProviderCrashed extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderCrashed'
  }
}

function emptyAnswer(): AgentGenerationResult {
  return { text: '', finishReason: 'stop' }
}

function usefulAnswer(): AgentGenerationResult {
  return { object: { done: true }, text: 'all done', finishReason: 'stop', suspendPayload: null }
}

function recordedFailure(directory: string, agentId: string): Record<string, unknown> {
  const text = readFileSync(`${directory}/.factory/logs/${agentId}-failed-request.json`, 'utf8')
  return z.record(z.string(), z.unknown()).parse(JSON.parse(text))
}

describe('createAgentGeneration', () => {
  it('passes the thinking level as a Mastra reasoning model setting and builds no providerOptions', async () => {
    const { agent, calls } = agentWithResponseQueue([usefulAnswer()])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    const response = await generate(aRequest({ thinking: 'high' }))

    expect(response).toStrictEqual({
      object: { done: true },
      text: 'all done',
      finishReason: 'stop',
      suspendPayload: null,
    })
    expect(calls[0]?.options.modelSettings).toStrictEqual({ reasoning: 'high' })
    expect(calls[0]?.options).not.toHaveProperty('providerOptions')
  })

  it('maps the off thinking level to reasoning none', async () => {
    const { agent, calls } = agentWithResponseQueue([usefulAnswer()])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    await generate(aRequest({ thinking: 'off' }))

    expect(calls[0]?.options.modelSettings).toStrictEqual({ reasoning: 'none' })
  })

  it('throws an invalid thinking level error when the thinking level is unknown', async () => {
    const { agent } = agentWithResponseQueue([])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    await expect(generate(aRequest({ thinking: 'maximum' }))).rejects.toThrow(
      'The thinking level maximum is not off, low, medium or high.',
    )
  })

  it('continues the remembered thread when the request carries a thread id', async () => {
    const { agent, calls } = agentWithResponseQueue([usefulAnswer()])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    await generate(aRequest({ threadId: 'issue-564' }))

    expect(calls[0]?.options.memory).toStrictEqual({ thread: 'issue-564', resource: 'factory' })
    expect(calls[0]?.options.autoResumeSuspendedTools).toBe(true)
  })

  it('passes the response schema and its model when a response schema is given', async () => {
    const { agent, calls } = agentWithResponseQueue([
      { object: { answer: 'yes' }, text: '', finishReason: 'stop' },
    ])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })
    const schema = z.object({ answer: z.string() })

    await generate(aRequest({ responseSchema: schema }))

    expect(calls[0]?.options.structuredOutput?.model).toStrictEqual({
      providerId: 'zai',
      modelId: 'glm-5.3-flash',
    })
    expect(calls[0]?.options.structuredOutput?.schema).toBe(schema)
  })

  it('retries when the first answer is empty and returns the next answer', async () => {
    const { agent, calls } = agentWithResponseQueue([emptyAnswer(), usefulAnswer()])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    const response = await generate(aRequest())

    expect(response.text).toBe('all done')
    expect(calls).toHaveLength(2)
  })

  it('gives up after three attempts when every answer is empty', async () => {
    const { agent, calls } = agentWithResponseQueue([emptyAnswer(), emptyAnswer(), emptyAnswer()])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    const response = await generate(aRequest())

    expect(response).toStrictEqual({
      object: undefined,
      text: '',
      finishReason: 'stop',
      suspendPayload: undefined,
    })
    expect(calls).toHaveLength(3)
  })

  it('resolves an aborted generation when the generation never settles', async () => {
    const agent: GeneratingAgent = {
      generate: () => new Promise<AgentGenerationResult>(() => undefined),
    }
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    const response = await generate(aRequest({ timeBudgetMs: 100 }))

    expect(response).toStrictEqual({
      object: undefined,
      text: '',
      finishReason: 'aborted',
      suspendPayload: null,
    })
  })

  it('returns an aborted generation and captures nothing when the time budget ran out', async () => {
    const workingDirectory = mkdtempSync(join(tmpdir(), 'factory-abort-'))
    process.chdir(workingDirectory)
    const agent: GeneratingAgent = {
      generate: async (_prompt, options) => {
        await new Promise((_resolve, reject) => {
          options.abortSignal.addEventListener('abort', () =>
            reject(new ProviderCrashed('The provider answered after the abort.')),
          )
        })
        throw new ProviderCrashed('The provider answered after the abort.')
      },
    }
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    const response = await generate(aRequest({ timeBudgetMs: 1 }))

    expect(response).toStrictEqual({
      object: undefined,
      text: '',
      finishReason: 'aborted',
      suspendPayload: null,
    })
    expect(existsSync(`${workingDirectory}/.factory/logs/implementer-failed-request.json`)).toBe(
      false,
    )
  })

  it('captures the failed provider request to disk and rethrows the original error unchanged', async () => {
    const workingDirectory = mkdtempSync(join(tmpdir(), 'factory-capture-'))
    process.chdir(workingDirectory)
    const rejection = new RejectedProviderRequest('The messages parameter is illegal', {
      messages: [{ role: 'user', content: 'please implement' }],
    })
    const { agent } = agentWithResponseQueue([rejection])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    await expect(generate(aRequest())).rejects.toBe(rejection)

    const recorded = recordedFailure(workingDirectory, 'implementer')
    expect(recorded['agentId']).toBe('implementer')
    expect(recorded['model']).toBe('zai/glm-5.3-flash')
  })

  it('records the timestamp, thinking level and rejected request body in the failure file', async () => {
    const workingDirectory = mkdtempSync(join(tmpdir(), 'factory-capture-'))
    process.chdir(workingDirectory)
    const { agent } = agentWithResponseQueue([
      new RejectedProviderRequest('illegal messages', {
        messages: [{ role: 'user', content: 'please implement' }],
      }),
    ])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    await expect(generate(aRequest())).rejects.toThrow('illegal messages')

    const recorded = recordedFailure(workingDirectory, 'implementer')
    expect(typeof recorded['timestamp']).toBe('string')
    expect(recorded).toStrictEqual({
      timestamp: recorded['timestamp'],
      agentId: 'implementer',
      model: 'zai/glm-5.3-flash',
      thinking: 'high',
      requestBody: {
        messages: [{ role: 'user', content: 'please implement' }],
      },
    })
  })

  it('overwrites the failure file so each agent keeps only its newest failure', async () => {
    const workingDirectory = mkdtempSync(join(tmpdir(), 'factory-overwrite-'))
    process.chdir(workingDirectory)
    const { agent } = agentWithResponseQueue([
      new RejectedProviderRequest('first failure', { attempt: 1 }),
      new RejectedProviderRequest('second failure', { attempt: 2 }),
    ])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    await expect(generate(aRequest())).rejects.toThrow('first failure')
    await expect(generate(aRequest())).rejects.toThrow('second failure')

    expect(recordedFailure(workingDirectory, 'implementer')['requestBody']).toStrictEqual({
      attempt: 2,
    })
    expect(readdirSync(`${workingDirectory}/.factory/logs`)).toStrictEqual([
      'implementer-failed-request.json',
    ])
  })

  it('notes the missing request body when the error carries none', async () => {
    const workingDirectory = mkdtempSync(join(tmpdir(), 'factory-nobody-'))
    process.chdir(workingDirectory)
    const { agent } = agentWithResponseQueue([new ProviderCrashed('refused without a body')])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    await expect(generate(aRequest())).rejects.toThrow('refused without a body')

    const recorded = recordedFailure(workingDirectory, 'implementer')
    expect(recorded['requestBody']).toBeNull()
    expect(recorded['note']).toBe('The request body was not available on the error.')
  })

  it('rethrows the original error when the failure capture itself fails', async () => {
    const workingDirectory = mkdtempSync(join(tmpdir(), 'factory-capture-broken-'))
    process.chdir(workingDirectory)
    // A regular file where the log directory belongs makes mkdirSync fail for every user.
    writeFileSync(`${workingDirectory}/.factory`, 'not a directory')
    const rejection = new RejectedProviderRequest('the real generation failure')
    const { agent } = agentWithResponseQueue([rejection])
    const generate = createAgentGeneration({
      workingDirectory: process.cwd(),
      agentFor: () => agent,
    })

    await expect(generate(aRequest())).rejects.toBe(rejection)
  })
})

describe('failedProviderRequestOf', () => {
  const request = aRequest()

  it('carries the rejected request body when the error has one', () => {
    const record = failedProviderRequestOf(
      request,
      new RejectedProviderRequest('illegal', { prompt: 'hello' }),
      '2026-10-23T10:00:00.000Z',
    )

    expect(record).toStrictEqual({
      timestamp: '2026-10-23T10:00:00.000Z',
      agentId: 'implementer',
      model: 'zai/glm-5.3-flash',
      thinking: 'high',
      requestBody: { prompt: 'hello' },
    })
  })

  it('carries a null request body and a note when the error has none', () => {
    const record = failedProviderRequestOf(
      request,
      new ProviderCrashed('boom'),
      '2026-10-23T10:00:00.000Z',
    )

    expect(record.requestBody).toBeNull()
    expect(record.note).toBe('The request body was not available on the error.')
  })

  it('carries a null request body when the error carries the body as undefined', () => {
    const record = failedProviderRequestOf(
      request,
      new RejectedProviderRequest('illegal messages'),
      '2026-10-23T10:00:00.000Z',
    )

    expect(record['requestBody']).toBeNull()
    expect(record['note']).toBe('The request body was not available on the error.')
  })

  it('carries a null request body when the failure was not an error object', () => {
    const record = failedProviderRequestOf(
      request,
      'the provider gave up',
      '2026-10-23T10:00:00.000Z',
    )

    expect(record.requestBody).toBeNull()
    expect(record.note).toBe('The request body was not available on the error.')
  })
})

const originalWorkingDirectory = process.cwd()

beforeEach(() => {
  process.chdir(originalWorkingDirectory)
})

afterEach(() => {
  process.chdir(originalWorkingDirectory)
})
