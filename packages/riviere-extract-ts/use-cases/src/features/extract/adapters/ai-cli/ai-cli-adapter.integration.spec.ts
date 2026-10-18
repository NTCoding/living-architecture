import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { RunAiCliInput } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/ai-cli'
import { ChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'
import { AiCliAdapter } from './ai-cli-adapter'

const ECHO_EXECUTABLE = `#!/usr/bin/env node
let stdin = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  stdin += chunk
})
process.stdin.on('end', () => {
  process.stdout.write(JSON.stringify({ args: process.argv.slice(2), stdin }))
})
`

const HANGING_EXECUTABLE = `#!/usr/bin/env node
setTimeout(() => {
  process.stdout.write('too late')
}, 60000)
`

const LARGE_OUTPUT_EXECUTABLE = `#!/usr/bin/env node
process.stdout.write('x'.repeat(50000))
`

const SELF_TERMINATING_EXECUTABLE = `#!/usr/bin/env node
process.kill(process.pid, 'SIGTERM')
`

const CHUNKED_OUTPUT_EXECUTABLE = `#!/usr/bin/env node
process.stdout.write('0123456789')
setTimeout(() => {
  process.stdout.write('more output after the limit')
}, 20)
`

const STDERR_EXECUTABLE = `#!/usr/bin/env node
process.stderr.write('provider rejected the request')
process.exit(2)
`

function invocationInput(command: string, overrides: Partial<RunAiCliInput> = {}): RunAiCliInput {
  return {
    command,
    args: [],
    prompt: 'Describe the missing events',
    timeoutSeconds: 10,
    maximumOutputBytes: 4096,
    ...overrides,
  }
}

const directories: string[] = []
const adapter = new AiCliAdapter(new ChildProcessClient())

async function createDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ai-cli-adapter-'))
  directories.push(directory)
  return directory
}

describe('AiCliAdapter with a stub executable', () => {
  afterEach(async () => {
    for (const directory of directories.splice(0)) {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('invokes the executable with the prompt on stdin', async () => {
    const directory = await createDirectory()
    const executable = join(directory, 'echo-ai-cli')
    await writeFile(executable, ECHO_EXECUTABLE)
    await chmod(executable, 0o755)

    const result = await adapter.run(invocationInput(executable))

    expect(result).toStrictEqual({
      kind: 'success',
      output: JSON.stringify({ args: [], stdin: 'Describe the missing events' }),
      outputTruncated: false,
    })
  })

  it('reports an available command when the executable can run', async () => {
    const directory = await createDirectory()
    const executable = join(directory, 'echo-ai-cli')
    await writeFile(executable, ECHO_EXECUTABLE)
    await chmod(executable, 0o755)

    await expect(adapter.checkAvailability(executable)).resolves.toStrictEqual({
      kind: 'available',
      command: executable,
    })
  })

  it('bounds output from a successful run', async () => {
    const directory = await createDirectory()
    const executable = join(directory, 'large-ai-cli')
    await writeFile(executable, LARGE_OUTPUT_EXECUTABLE)
    await chmod(executable, 0o755)

    const result = await adapter.run(invocationInput(executable, { maximumOutputBytes: 10 }))

    expect(result).toStrictEqual({
      kind: 'success',
      output: 'xxxxxxxxxx',
      outputTruncated: true,
    })
  })

  it('marks output as truncated when a later chunk arrives after the byte limit', async () => {
    const directory = await createDirectory()
    const executable = join(directory, 'chunked-ai-cli')
    await writeFile(executable, CHUNKED_OUTPUT_EXECUTABLE)
    await chmod(executable, 0o755)

    const result = await adapter.run(invocationInput(executable, { maximumOutputBytes: 10 }))

    expect(result).toStrictEqual({
      kind: 'success',
      output: '0123456789',
      outputTruncated: true,
    })
  })

  it('reports stderr from a non-zero exit', async () => {
    const directory = await createDirectory()
    const executable = join(directory, 'stderr-ai-cli')
    await writeFile(executable, STDERR_EXECUTABLE)
    await chmod(executable, 0o755)

    const result = await adapter.run(invocationInput(executable))

    expect(result).toStrictEqual({
      kind: 'execution-failure',
      command: executable,
      exitCode: 2,
      stderr: 'provider rejected the request',
    })
  })

  it('reports a spawn failure when the process terminates from a signal', async () => {
    const directory = await createDirectory()
    const executable = join(directory, 'self-terminating-ai-cli')
    await writeFile(executable, SELF_TERMINATING_EXECUTABLE)
    await chmod(executable, 0o755)

    const result = await adapter.run(invocationInput(executable))

    expect(result).toStrictEqual({
      kind: 'spawn-failure',
      command: executable,
      reason: "Process terminated by signal 'SIGTERM'",
    })
  })

  it('reports a spawn failure when the command cannot be spawned', async () => {
    const result = await adapter.run(invocationInput('node\u0000invalid'))

    expect(result).toMatchObject({ kind: 'spawn-failure', command: 'node\u0000invalid' })
  })

  it('returns a timeout result when the executable exceeds the configured timeout', async () => {
    const directory = await createDirectory()
    const executable = join(directory, 'hanging-ai-cli')
    await writeFile(executable, HANGING_EXECUTABLE)
    await chmod(executable, 0o755)

    const result = await adapter.run(invocationInput(executable, { timeoutSeconds: 0.1 }))

    expect(result).toStrictEqual({
      kind: 'timeout',
      timeoutSeconds: 0.1,
      partialOutput: '',
    })
  })

  it('reports an unavailable command when the executable does not exist', async () => {
    const directory = await createDirectory()
    await expect(
      adapter.checkAvailability(join(directory, 'missing-ai-cli')),
    ).resolves.toStrictEqual({
      kind: 'unavailable',
      command: join(directory, 'missing-ai-cli'),
      reason: `spawn ${join(directory, 'missing-ai-cli')} ENOENT`,
    })
  })
})
