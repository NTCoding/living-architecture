import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChildProcessRunInput } from './child-process-client'
import {
  ChildProcessClient,
  isBenignStdinWriteError,
  windowsPathExtensions,
} from './child-process-client'

const STDIN_EXECUTABLE = `#!/usr/bin/env node
let stdin = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  stdin += chunk
})
process.stdin.on('end', () => {
  process.stdout.write('stdin:' + stdin)
})
`

const ENVIRONMENT_EXECUTABLE = `#!/usr/bin/env node
process.stdout.write('env:' + String(process.env.AI_CLI_TEST_VALUE))
`

const BOUNDED_OUTPUT_EXECUTABLE = `#!/usr/bin/env node
process.stdout.write('x'.repeat(5000))
process.stderr.write('provider rejected the request')
`

const CHUNKED_OUTPUT_EXECUTABLE = `#!/usr/bin/env node
process.stdout.write('0123456789')
setTimeout(() => {
  process.stdout.write('more output after the limit')
}, 20)
`

const HANGING_EXECUTABLE = `#!/usr/bin/env node
setTimeout(() => {
  process.stdout.write('too late')
}, 60000)
`

const SELF_TERMINATING_EXECUTABLE = `#!/usr/bin/env node
process.kill(process.pid, 'SIGTERM')
`

const NO_STDIN_EXECUTABLE = `#!/usr/bin/env node
process.exit(0)
`

const EXITS_BEFORE_STDIN_EXECUTABLE = `#!/usr/bin/env node
process.exit(0)
`

class StdinWriteTestError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'StdinWriteTestError'
    this.code = code
  }
}

const directories: string[] = []
const client = new ChildProcessClient()

async function createDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'child-process-client-'))
  directories.push(directory)
  return directory
}

async function createExecutable(name: string, contents: string): Promise<string> {
  const directory = await createDirectory()
  const executable = join(directory, name)
  await writeFile(executable, contents)
  await chmod(executable, 0o755)
  return executable
}

type RunOverrides = Readonly<{
  readonly args?: readonly string[]
  readonly timeoutMilliseconds?: number
  readonly maximumOutputBytes?: number
}>

function noStdinInput(command: string, overrides: RunOverrides = {}): ChildProcessRunInput {
  return {
    kind: 'no-stdin',
    command,
    args: [],
    timeoutMilliseconds: 10_000,
    maximumOutputBytes: 4096,
    ...overrides,
  }
}

function stdinInput(
  command: string,
  stdin: string,
  overrides: RunOverrides = {},
): ChildProcessRunInput {
  return {
    kind: 'pipe-stdin',
    command,
    stdin,
    args: [],
    timeoutMilliseconds: 10_000,
    maximumOutputBytes: 4096,
    ...overrides,
  }
}

afterEach(async () => {
  vi.unstubAllEnvs()
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

describe('windowsPathExtensions', () => {
  it('returns the default Windows extensions when PATHEXT is absent', () => {
    expect(windowsPathExtensions('win32', undefined)).toStrictEqual([
      '.COM',
      '.EXE',
      '.BAT',
      '.CMD',
    ])
  })

  it('normalizes configured Windows extensions', () => {
    expect(windowsPathExtensions('win32', 'CMD;.bat;')).toStrictEqual(['.CMD', '.bat'])
  })

  it('returns no extensions on non-Windows platforms', () => {
    expect(windowsPathExtensions('linux', '.CMD')).toStrictEqual([])
  })
})

describe('ChildProcessClient executable resolution', () => {
  it('resolves an executable path that exists', () => {
    expect(client.resolveExecutable(process.execPath)).toStrictEqual({
      kind: 'resolved',
      executablePath: process.execPath,
    })
  })

  it('resolves a command found on PATH to the node executable', () => {
    const resolution = client.resolveExecutable('node')

    expect(resolution.kind).toBe('resolved')
    expect(resolution.kind === 'resolved' && basename(resolution.executablePath)).toBe('node')
  })

  it('reports a file without execute permission as not found', async () => {
    const directory = await createDirectory()
    const command = join(directory, 'not-executable-ai-cli')
    await writeFile(command, 'not executable')
    await chmod(command, 0o644)

    expect(client.resolveExecutable(command)).toStrictEqual({ kind: 'not-found', command })
  })

  it('reports a whitespace-only command as invalid', () => {
    expect(client.resolveExecutable('   ')).toStrictEqual({
      kind: 'invalid-command',
      command: '   ',
    })
  })

  it('reports an existing directory as not found', () => {
    expect(client.resolveExecutable('/tmp')).toStrictEqual({ kind: 'not-found', command: '/tmp' })
  })

  it('reports a missing executable path as not found', () => {
    const command = join(tmpdir(), 'missing-ai-cli-executable')

    expect(client.resolveExecutable(command)).toStrictEqual({ kind: 'not-found', command })
  })

  it('reports a command as not found when no PATH directory contains it', () => {
    expect(client.resolveExecutable('definitely-not-a-real-ai-cli-command')).toStrictEqual({
      kind: 'not-found',
      command: 'definitely-not-a-real-ai-cli-command',
    })
  })

  it('does not search the current working directory when PATH is unavailable', async () => {
    const directory = await createDirectory()
    const command = 'local-ai-cli'
    const executable = join(directory, command)
    await writeFile(executable, 'local executable')
    await chmod(executable, 0o755)
    const originalWorkingDirectory = process.cwd()
    vi.stubEnv('PATH', undefined)
    process.chdir(directory)
    try {
      expect(client.resolveExecutable(command)).toStrictEqual({ kind: 'not-found', command })
    } finally {
      process.chdir(originalWorkingDirectory)
    }
  })

  it('resolves a Windows command name through PATHEXT extensions', async () => {
    const directory = await createDirectory()
    const command = join(directory, 'claude.cmd')
    await writeFile(command, '')
    await chmod(command, 0o755)
    const windowsClient = new ChildProcessClient(() => ({
      platform: 'win32',
      searchPath: directory,
      pathExtensions: ['.CMD'],
    }))

    expect(windowsClient.resolveExecutable('claude')).toStrictEqual({
      kind: 'resolved',
      executablePath: join(directory, 'claude.CMD'),
    })
  })

  it('reports a Windows command as not found when no PATHEXT extension matches', async () => {
    const directory = await createDirectory()
    const windowsClient = new ChildProcessClient(() => ({
      platform: 'win32',
      searchPath: directory,
      pathExtensions: ['.CMD'],
    }))

    expect(windowsClient.resolveExecutable('claude')).toStrictEqual({
      kind: 'not-found',
      command: 'claude',
    })
  })
})

describe('ChildProcessClient run', () => {
  it('writes the supplied stdin payload to the child process', async () => {
    const executable = await createExecutable('stdin-child', STDIN_EXECUTABLE)

    const result = await client.run(stdinInput(executable, 'prompt text'))

    expect(result).toStrictEqual({
      kind: 'completed',
      exitCode: 0,
      stdout: { text: 'stdin:prompt text', truncated: false },
      stderr: { text: '', truncated: false },
    })
  })

  it('closes stdin for a run without a stdin payload', async () => {
    const executable = await createExecutable('no-stdin-child', NO_STDIN_EXECUTABLE)

    await expect(client.run(noStdinInput(executable))).resolves.toStrictEqual({
      kind: 'completed',
      exitCode: 0,
      stdout: { text: '', truncated: false },
      stderr: { text: '', truncated: false },
    })
  })

  it('does not crash when the child exits before consuming a large stdin payload', async () => {
    const executable = await createExecutable('early-exit-child', EXITS_BEFORE_STDIN_EXECUTABLE)

    const result = await client.run(stdinInput(executable, 'x'.repeat(2_000_000)))

    expect(result).toStrictEqual({
      kind: 'completed',
      exitCode: 0,
      stdout: { text: '', truncated: false },
      stderr: { text: '', truncated: false },
    })
  })

  it('inherits the current process environment', async () => {
    const executable = await createExecutable('environment-child', ENVIRONMENT_EXECUTABLE)
    vi.stubEnv('AI_CLI_TEST_VALUE', 'visible-to-child')

    const result = await client.run(noStdinInput(executable))

    expect(result).toMatchObject({
      kind: 'completed',
      stdout: { text: 'env:visible-to-child' },
    })
  })

  it('bounds stdout and stderr with independent budgets', async () => {
    const executable = await createExecutable('bounded-output-child', BOUNDED_OUTPUT_EXECUTABLE)

    const result = await client.run(noStdinInput(executable, { maximumOutputBytes: 100 }))

    expect(result).toStrictEqual({
      kind: 'completed',
      exitCode: 0,
      stdout: { text: 'x'.repeat(100), truncated: true },
      stderr: { text: 'provider rejected the request', truncated: false },
    })
  })

  it('marks output as truncated when a later chunk arrives after the byte limit', async () => {
    const executable = await createExecutable('chunked-output-child', CHUNKED_OUTPUT_EXECUTABLE)

    const result = await client.run(noStdinInput(executable, { maximumOutputBytes: 10 }))

    expect(result).toStrictEqual({
      kind: 'completed',
      exitCode: 0,
      stdout: { text: '0123456789', truncated: true },
      stderr: { text: '', truncated: false },
    })
  })

  it('kills the child process when the timeout elapses', async () => {
    const executable = await createExecutable('hanging-child', HANGING_EXECUTABLE)

    await expect(
      client.run(noStdinInput(executable, { timeoutMilliseconds: 100 })),
    ).resolves.toStrictEqual({
      kind: 'timed-out',
      stdout: { text: '', truncated: false },
      stderr: { text: '', truncated: false },
    })
  })

  it.each([0, -1])(
    'returns a timeout result when timeoutMilliseconds is %i',
    async (timeoutMilliseconds) => {
      const executable = await createExecutable('hanging-edge-child', HANGING_EXECUTABLE)

      await expect(
        client.run(noStdinInput(executable, { timeoutMilliseconds })),
      ).resolves.toStrictEqual({
        kind: 'timed-out',
        stdout: { text: '', truncated: false },
        stderr: { text: '', truncated: false },
      })
    },
  )

  it.each([0, -1])(
    'returns empty truncated output when maximumOutputBytes is %i',
    async (maximumOutputBytes) => {
      const executable = await createExecutable('bounded-edge-child', BOUNDED_OUTPUT_EXECUTABLE)

      const result = await client.run(noStdinInput(executable, { maximumOutputBytes }))

      expect(result).toMatchObject({
        kind: 'completed',
        stdout: { text: '', truncated: true },
      })
    },
  )

  it('reports a spawn failure when the command cannot be spawned', async () => {
    const result = await client.run(noStdinInput('node\u0000invalid'))

    expect(result).toMatchObject({ kind: 'spawn-failed' })
    expect(result.kind === 'spawn-failed' && result.reason).toContain('null bytes')
  })

  it('does not use a shell to spawn the command', async () => {
    const result = await client.run(noStdinInput(`${process.execPath} -e "process.exit(0)"`))

    expect(result).toMatchObject({ kind: 'spawn-failed' })
  })

  it('reports a signal termination when the child is terminated from a signal', async () => {
    const executable = await createExecutable('self-terminating-child', SELF_TERMINATING_EXECUTABLE)

    await expect(client.run(noStdinInput(executable))).resolves.toStrictEqual({
      kind: 'terminated-by-signal',
      signal: 'SIGTERM',
      stdout: { text: '', truncated: false },
      stderr: { text: '', truncated: false },
    })
  })

  it('treats EPIPE and destroyed stdin streams as benign write failures', () => {
    const pipeError = new StdinWriteTestError('write EPIPE', 'EPIPE')
    const destroyedError = new StdinWriteTestError('stream destroyed', 'ERR_STREAM_DESTROYED')
    const permissionError = new StdinWriteTestError('write EACCES', 'EACCES')

    expect(isBenignStdinWriteError(pipeError)).toBe(true)
    expect(isBenignStdinWriteError(destroyedError)).toBe(true)
    expect(isBenignStdinWriteError(permissionError)).toBe(false)
  })
})
