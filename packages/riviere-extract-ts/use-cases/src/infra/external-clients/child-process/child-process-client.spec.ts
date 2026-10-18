import { describe, expect, it } from 'vitest'
import { NodeChildProcessClient } from './child-process-client'

function nodeScript(script: string): { command: string; args: readonly string[] } {
  return { command: process.execPath, args: ['-e', script] }
}

describe('NodeChildProcessClient.execute', () => {
  it('captures stdout and reports the exit code when the child exits', async () => {
    const client = new NodeChildProcessClient()
    const invocation = nodeScript("process.stdout.write('ready')")

    const result = await client.execute({
      ...invocation,
      timeoutMilliseconds: 5_000,
    })

    expect(result).toStrictEqual({
      kind: 'exited',
      exitCode: 0,
      stdout: { text: 'ready', truncated: false },
      stderr: { text: '', truncated: false },
    })
  })

  it('writes the request stdin content into the child process', async () => {
    const client = new NodeChildProcessClient()
    const invocation = nodeScript(
      "process.stdin.on('data', (chunk) => process.stdout.write(chunk))",
    )

    const result = await client.execute({
      ...invocation,
      stdin: 'architecture prompt',
      timeoutMilliseconds: 5_000,
    })

    expect(result).toStrictEqual({
      kind: 'exited',
      exitCode: 0,
      stdout: { text: 'architecture prompt', truncated: false },
      stderr: { text: '', truncated: false },
    })
  })

  it('reports the non-zero exit code when the child rejects its input', async () => {
    const client = new NodeChildProcessClient()
    const invocation = nodeScript("process.stderr.write('bad prompt'); process.exit(3)")

    const result = await client.execute({
      ...invocation,
      timeoutMilliseconds: 5_000,
    })

    expect(result).toStrictEqual({
      kind: 'exited',
      exitCode: 3,
      stdout: { text: '', truncated: false },
      stderr: { text: 'bad prompt', truncated: false },
    })
  })

  it('kills the child and reports a timeout when the child exceeds its budget', async () => {
    const client = new NodeChildProcessClient()
    const invocation = nodeScript('setTimeout(() => process.exit(0), 30_000)')

    const result = await client.execute({
      ...invocation,
      timeoutMilliseconds: 100,
    })

    expect(result).toStrictEqual({
      kind: 'timed-out',
      timeoutMilliseconds: 100,
      stdout: { text: '', truncated: false },
      stderr: { text: '', truncated: false },
    })
  })

  it('reports a launch failure when the executable does not exist', async () => {
    const client = new NodeChildProcessClient()

    const result = await client.execute({
      command: 'riviere-definitely-missing-executable',
      args: [],
      timeoutMilliseconds: 5_000,
    })

    expect(result).toMatchObject({
      kind: 'failed',
      reason: 'spawn riviere-definitely-missing-executable ENOENT',
      stdout: { text: '', truncated: false },
      stderr: { text: '', truncated: false },
    })
  })

  it('reports a launch failure when the child ends without an exit code', async () => {
    const client = new NodeChildProcessClient()
    const invocation = nodeScript("process.kill(process.pid, 'SIGTERM')")

    const result = await client.execute({
      ...invocation,
      timeoutMilliseconds: 5_000,
    })

    expect(result).toStrictEqual({
      kind: 'failed',
      reason: 'Process ended without an exit code',
      stdout: { text: '', truncated: false },
      stderr: { text: '', truncated: false },
    })
  })

  it('marks captured output as truncated when it exceeds the configured bound', async () => {
    const client = new NodeChildProcessClient({ maxCapturedBytes: 5 })
    const invocation = nodeScript(
      [
        "process.stdout.write('abc')",
        "setTimeout(() => process.stdout.write('defghijkl'), 20)",
        "setTimeout(() => process.stdout.write('mnop'), 40)",
      ].join(';'),
    )

    const result = await client.execute({
      ...invocation,
      timeoutMilliseconds: 5_000,
    })

    expect(result).toStrictEqual({
      kind: 'exited',
      exitCode: 0,
      stdout: { text: 'abcde', truncated: true },
      stderr: { text: '', truncated: false },
    })
  })
})

describe('NodeChildProcessClient.checkExecutableAvailability', () => {
  it('reports the executable as available when the locator resolves it', async () => {
    const client = new NodeChildProcessClient()

    const result = await client.checkExecutableAvailability(process.execPath)

    expect(result).toStrictEqual({ kind: 'available' })
  })

  it('reports the executable as unavailable when the locator fails', async () => {
    const client = new NodeChildProcessClient()

    const result = await client.checkExecutableAvailability('riviere-definitely-missing-executable')

    expect(result).toStrictEqual({
      kind: 'unavailable',
      reason: "'riviere-definitely-missing-executable' is not installed or not in PATH",
    })
  })

  it.skipIf(process.platform === 'win32')(
    'reports the executable as unavailable when the locator cannot be launched',
    async () => {
      const client = new NodeChildProcessClient({ platform: 'win32' })

      const result = await client.checkExecutableAvailability(process.execPath)

      expect(result).toStrictEqual({
        kind: 'unavailable',
        reason: `'${process.execPath}' is not installed or not in PATH`,
      })
    },
  )
})
