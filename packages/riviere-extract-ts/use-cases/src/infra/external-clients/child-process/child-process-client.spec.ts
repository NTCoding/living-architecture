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
  it('captures standard output when the process exits successfully', async () => {
    const result = await client.run(stubInput('echo-arguments', ['one', 'two']))

    expect(result).toStrictEqual({
      kind: 'completed',
      exitCode: 0,
      stdout: 'arguments:one|two',
      stderr: '',
    })
  })

  it('writes the supplied standard input to the process', async () => {
    const result = await client.run({ ...stubInput('echo-stdin'), stdin: 'prompt text' })

    expect(result).toStrictEqual({
      kind: 'completed',
      exitCode: 0,
      stdout: 'stdin:prompt text',
      stderr: '',
    })
  })

  it('returns the process exit code and error output when the process fails', async () => {
    const result = await client.run(stubInput('fail', ['boom']))

    expect(result).toStrictEqual({
      kind: 'completed',
      exitCode: 3,
      stdout: '',
      stderr: 'boom',
    })
  })

  it('ignores a broken standard-input pipe when the process exits before reading it', async () => {
    const result = await client.run({
      ...stubInput('exit-immediately'),
      stdin: 'x'.repeat(200000),
    })

    expect(result).toStrictEqual({ kind: 'completed', exitCode: 0, stdout: '', stderr: '' })
  })

  it('returns a typed timeout and kills a process that exceeds its timeout', async () => {
    const result = await client.run({ ...stubInput('sleep', ['5000']), timeoutSeconds: 0.1 })

    expect(result).toStrictEqual({ kind: 'timed-out' })
  })

  it('returns an output truncation result when captured output exceeds one megabyte', async () => {
    const result = await client.run(stubInput('large-output', ['2000000']))

    expect(result).toStrictEqual({ kind: 'output-truncated', limitBytes: 1048576 })
  })

  it('returns a spawn failure when the command is terminated by a signal', async () => {
    const result = await client.run(stubInput('self-kill'))

    expect(result).toStrictEqual({
      kind: 'spawn-failure',
      reason: 'Command terminated by a signal.',
    })
  })

  it('returns a spawn failure when the command cannot be spawned', async () => {
    const result = await client.run({
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

describe('ChildProcessClient executable lookup', () => {
  it('reports an executable on PATH as available', () => {
    const result = client.lookupExecutable(process.execPath)

    expect(result).toStrictEqual({ kind: 'available' })
  })

  it('reports a missing direct executable path as unavailable', () => {
    const result = client.lookupExecutable('/definitely/missing/ai-cli-executable')

    expect(result).toStrictEqual({
      kind: 'unavailable',
      reason: "Executable not found at '/definitely/missing/ai-cli-executable'.",
    })
  })

  it('reports an executable on PATH as available', () => {
    const result = client.lookupExecutable('node')

    expect(result).toStrictEqual({ kind: 'available' })
  })

  it('reports an unavailable executable when PATH is not configured', () => {
    const originalPath = process.env['PATH']
    delete process.env['PATH']
    try {
      expect(client.lookupExecutable('node')).toStrictEqual({
        kind: 'unavailable',
        reason: 'PATH is not configured.',
      })
    } finally {
      process.env['PATH'] = originalPath
    }
  })

  it('reports a missing executable as unavailable without starting it', () => {
    const result = client.lookupExecutable('definitely-not-a-real-command-for-ai-cli-tests')

    expect(result).toStrictEqual({
      kind: 'unavailable',
      reason: "Executable 'definitely-not-a-real-command-for-ai-cli-tests' was not found on PATH.",
    })
  })
})
