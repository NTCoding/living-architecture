import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createChildProcessClient } from './child-process-client'

const stubPath = fileURLToPath(new URL('./__fixtures__/ai-cli-stub.mjs', import.meta.url))
const client = createChildProcessClient()

function stubInput(mode: string, extraArguments: readonly string[] = []) {
  return {
    command: process.execPath,
    arguments: [stubPath, mode, ...extraArguments],
    stdin: undefined,
    timeoutSeconds: 5,
  }
}

describe('ChildProcessClient run', () => {
  it('captures standard output when the process exits successfully', () => {
    const result = client.run(stubInput('echo-arguments', ['one', 'two']))

    expect(result).toStrictEqual({
      kind: 'completed',
      exitCode: 0,
      stdout: 'arguments:one|two',
      stderr: '',
    })
  })

  it('writes the supplied standard input to the process', () => {
    const result = client.run({ ...stubInput('echo-stdin'), stdin: 'prompt text' })

    expect(result).toStrictEqual({
      kind: 'completed',
      exitCode: 0,
      stdout: 'stdin:prompt text',
      stderr: '',
    })
  })

  it('returns the process exit code and error output when the process fails', () => {
    const result = client.run(stubInput('fail', ['boom']))

    expect(result).toStrictEqual({
      kind: 'completed',
      exitCode: 3,
      stdout: '',
      stderr: 'boom',
    })
  })

  it('returns a typed timeout and kills a process that exceeds its timeout', () => {
    const result = client.run({ ...stubInput('sleep', ['5000']), timeoutSeconds: 0.1 })

    expect(result).toStrictEqual({ kind: 'timed-out' })
  })

  it('returns an output truncation result when captured output exceeds one megabyte', () => {
    const result = client.run(stubInput('large-output', ['2000000']))

    expect(result).toStrictEqual({ kind: 'output-truncated', limitBytes: 1048576 })
  })

  it('returns a spawn failure when the command is terminated by a signal', () => {
    const result = client.run(stubInput('self-kill'))

    expect(result).toStrictEqual({
      kind: 'spawn-failure',
      reason: "Command terminated by signal 'SIGKILL'.",
    })
  })

  it('returns a spawn failure when the command cannot be spawned', () => {
    const result = client.run({
      command: 'definitely-not-a-real-command-for-ai-cli-tests',
      arguments: [],
      stdin: undefined,
      timeoutSeconds: 5,
    })

    expect(result).toMatchObject({
      kind: 'spawn-failure',
      reason: expect.stringContaining('ENOENT'),
    })
  })
})

describe('ChildProcessClient probe', () => {
  it('reports a spawnable command as available', () => {
    const result = client.probe(process.execPath)

    expect(result).toStrictEqual({ kind: 'available' })
  })

  it('reports a missing command as unavailable', () => {
    const result = client.probe('definitely-not-a-real-command-for-ai-cli-tests')

    expect(result).toMatchObject({
      kind: 'unavailable',
      reason: expect.stringContaining('ENOENT'),
    })
  })
})
