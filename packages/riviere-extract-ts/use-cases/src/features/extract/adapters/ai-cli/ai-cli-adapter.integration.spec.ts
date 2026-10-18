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
  process.stdout.write('result:' + stdin)
})
`

const HANGING_EXECUTABLE = `#!/usr/bin/env node
setTimeout(() => {
  process.stdout.write('too late')
}, 60000)
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

describe('AiCliAdapter with a stub executable', () => {
  afterEach(async () => {
    for (const directory of directories.splice(0)) {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('invokes the executable with the prompt on stdin', async () => {
    const executable = await createExecutable('echo-ai-cli', ECHO_EXECUTABLE)

    const result = await adapter.run(invocationInput(executable))

    expect(result).toStrictEqual({
      kind: 'success',
      output: 'result:Describe the missing events',
      outputTruncated: false,
    })
  })

  it('returns a timeout result when the executable exceeds the configured timeout', async () => {
    const executable = await createExecutable('hanging-ai-cli', HANGING_EXECUTABLE)

    const result = await adapter.run(invocationInput(executable, { timeoutSeconds: 0.1 }))

    expect(result).toStrictEqual({
      kind: 'timeout',
      timeoutSeconds: 0.1,
      partialOutput: '',
      partialError: '',
    })
  })
})
