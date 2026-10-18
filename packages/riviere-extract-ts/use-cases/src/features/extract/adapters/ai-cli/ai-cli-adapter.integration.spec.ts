import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'
import { AiCliAdapter } from './ai-cli-adapter'

const ECHO_EXECUTABLE = `#!/usr/bin/env node
process.stdout.write('available')
`

const HANGING_EXECUTABLE = `#!/usr/bin/env node
setTimeout(() => {
  process.stdout.write('too late')
}, 60000)
`

const FAILING_EXECUTABLE = `#!/usr/bin/env node
process.exit(3)
`

const SELF_TERMINATING_EXECUTABLE = `#!/usr/bin/env node
process.kill(process.pid, 'SIGTERM')
`

const directories: string[] = []
const adapter = new AiCliAdapter(new ChildProcessClient())

async function createDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ai-cli-adapter-'))
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

describe('AiCliAdapter with a stub executable', () => {
  afterEach(async () => {
    for (const directory of directories.splice(0)) {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('reports an available command when the executable can run', async () => {
    const executable = await createExecutable('echo-ai-cli', ECHO_EXECUTABLE)

    await expect(adapter.checkAvailability(executable)).resolves.toStrictEqual({
      kind: 'available',
      command: executable,
    })
  })

  it('reports an unavailable command when the executable does not exist', async () => {
    const directory = await createDirectory()
    const command = join(directory, 'missing-ai-cli')

    const availability = await adapter.checkAvailability(command)

    expect(availability).toMatchObject({ kind: 'unavailable', command })
    expect(availability.kind === 'unavailable' && availability.reason).toContain('ENOENT')
  })

  it('reports an unavailable command when the executable exits non-zero', async () => {
    const executable = await createExecutable('failing-ai-cli', FAILING_EXECUTABLE)

    await expect(adapter.checkAvailability(executable)).resolves.toStrictEqual({
      kind: 'unavailable',
      command: executable,
      reason: `Command '${executable}' exited with code 3`,
    })
  })

  it('reports an unavailable command when the executable terminates from a signal', async () => {
    const executable = await createExecutable(
      'self-terminating-ai-cli',
      SELF_TERMINATING_EXECUTABLE,
    )

    await expect(adapter.checkAvailability(executable)).resolves.toStrictEqual({
      kind: 'unavailable',
      command: executable,
      reason: `Command '${executable}' terminated by signal 'SIGTERM'`,
    })
  })

  it('reports an unavailable command when the executable times out', async () => {
    const executable = await createExecutable('hanging-ai-cli', HANGING_EXECUTABLE)

    const availability = await adapter.checkAvailability(executable)

    expect(availability).toMatchObject({ kind: 'unavailable', command: executable })
    expect(availability.kind === 'unavailable' && availability.reason).toMatch(/timed out/i)
  })

  it('reports an unavailable command when the command cannot be spawned', async () => {
    const availability = await adapter.checkAvailability('node\u0000invalid')

    expect(availability).toMatchObject({ kind: 'unavailable', command: 'node\u0000invalid' })
    expect(availability.kind === 'unavailable' && availability.reason).toContain('null bytes')
  })
})
