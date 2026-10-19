import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { AiExtractConfig } from '@living-architecture/riviere-extract-config-published-language'
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

function stageConfiguration(
  command: string,
  overrides: Partial<AiExtractConfig> = {},
): AiExtractConfig {
  return {
    command,
    args: [],
    timeoutSeconds: 10,
    sources: ['./component.ts'],
    selection: { from: ['missing-events'], componentTypes: ['Event'] },
    outputs: { addComponents: true, addLinks: true },
    context: { exclude: [], maxFilesPerBatch: 10, maxBatches: 2 },
    ...overrides,
  }
}

function invocationInput(
  command: string,
  overrides: Partial<AiExtractConfig> = {},
  prompt = 'Describe the missing events',
): RunAiCliInput {
  return { stageConfiguration: stageConfiguration(command, overrides), prompt }
}

describe('AiCliAdapter with a stub executable', () => {
  afterEach(async () => {
    for (const directory of directories.splice(0)) {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('returns the executable output when the prompt is passed on stdin', async () => {
    const executable = await createExecutable('echo-ai-cli', ECHO_EXECUTABLE)

    const result = await adapter.run(invocationInput(executable))

    expect(result).toStrictEqual({
      kind: 'completed',
      output: 'result:Describe the missing events',
    })
  })

  it('returns a timeout result when the executable exceeds the configured timeout', async () => {
    const executable = await createExecutable('hanging-ai-cli', HANGING_EXECUTABLE)

    const result = await adapter.run(invocationInput(executable, { timeoutSeconds: 0.1 }))

    expect(result).toStrictEqual({ kind: 'timed-out' })
  })
})
