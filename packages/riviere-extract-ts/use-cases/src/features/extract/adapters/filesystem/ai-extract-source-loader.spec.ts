import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  parseAiExtractConfig,
  type AiExtractConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import { createAiExtractSourceLoader } from './ai-extract-source-loader'

const createdDirectories: string[] = []

afterEach(() => {
  while (createdDirectories.length > 0) {
    const directory = createdDirectories.pop()
    if (directory !== undefined) rmSync(directory, { force: true, recursive: true })
  }
})

function tempDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'ai-extract-sources-'))
  createdDirectories.push(directory)
  return directory
}

class FixtureConfigurationError extends Error {}

function aiExtractConfig(overrides: Record<string, unknown> = {}): AiExtractConfig {
  const parsed = parseAiExtractConfig({
    command: 'claude',
    args: ['{prompt}'],
    'timeout-seconds': 30,
    sources: ['./src'],
    selection: { from: ['missing-events'], 'component-types': ['Event'] },
    outputs: { 'add-components': true, 'add-links': true },
    context: { exclude: [], 'max-files-per-batch': 10, 'max-batches': 2 },
    ...overrides,
  })
  if (!parsed.success) throw new FixtureConfigurationError('fixture configuration is invalid')
  return parsed.config
}

describe('createAiExtractSourceLoader', () => {
  it('discovers matched source file paths in deterministic order plus configured optional contents', async () => {
    const directory = tempDirectory()
    writeFileSync(join(directory, 'b-orders.ts'), 'export const orders = 1')
    writeFileSync(join(directory, 'a-billing.ts'), 'export const billing = 2')
    writeFileSync(join(directory, 'memory.md'), 'OrderPlaced publishes an event')
    writeFileSync(join(directory, 'instructions.md'), 'Prefer past-tense event names')
    const loader = createAiExtractSourceLoader(directory)
    const discovery = await loader(
      aiExtractConfig({
        sources: ['**/*.ts'],
        memory: join(directory, 'memory.md'),
        'prompt-append': join(directory, 'instructions.md'),
      }),
    )
    expect(discovery.filePaths).toStrictEqual([
      join(directory, 'a-billing.ts'),
      join(directory, 'b-orders.ts'),
    ])
    expect(discovery.memoryContent).toBe('OrderPlaced publishes an event')
    expect(discovery.promptAppendContent).toBe('Prefer past-tense event names')
    expect(discovery.missingPaths).toStrictEqual([])
  })

  it('resolves relative sources and excludes against the project root', async () => {
    const directory = tempDirectory()
    mkdirSync(join(directory, 'src', 'ignored'), { recursive: true })
    writeFileSync(join(directory, 'src', 'orders.ts'), 'export const orders = 1')
    writeFileSync(join(directory, 'src', 'ignored', 'skipped.ts'), 'export const skipped = 1')
    const discovery = await createAiExtractSourceLoader(directory)(
      aiExtractConfig({
        sources: ['src'],
        context: { exclude: ['src/ignored'], 'max-files-per-batch': 10, 'max-batches': 2 },
      }),
    )
    expect(discovery.filePaths).toStrictEqual([join(directory, 'src', 'orders.ts')])
    expect(discovery.memoryContent).toBeUndefined()
    expect(discovery.promptAppendContent).toBeUndefined()
    expect(discovery.missingPaths).toStrictEqual([])
  })

  it('discovers a file matched by more than one source pattern once', async () => {
    const directory = tempDirectory()
    writeFileSync(join(directory, 'orders.ts'), 'export const orders = 1')
    const discovery = await createAiExtractSourceLoader(directory)(
      aiExtractConfig({ sources: ['orders.ts', '*.ts'] }),
    )
    expect(discovery.filePaths).toStrictEqual([join(directory, 'orders.ts')])
  })

  it('reports configured paths that do not exist instead of throwing', async () => {
    const directory = tempDirectory()
    const missingSource = join(directory, 'missing.ts')
    const missingMemory = join(directory, 'missing-memory.md')
    const missingInstructions = join(directory, 'missing-instructions.md')
    const discovery = await createAiExtractSourceLoader(directory)(
      aiExtractConfig({
        sources: [missingSource],
        memory: missingMemory,
        'prompt-append': missingInstructions,
      }),
    )
    expect(discovery.filePaths).toStrictEqual([])
    expect(discovery.missingPaths).toStrictEqual([
      missingSource,
      missingMemory,
      missingInstructions,
    ])
  })

  it('accepts an absolute exclude pattern', async () => {
    const directory = tempDirectory()
    mkdirSync(join(directory, 'ignored'), { recursive: true })
    writeFileSync(join(directory, 'orders.ts'), 'export const orders = 1')
    writeFileSync(join(directory, 'ignored', 'skipped.ts'), 'export const skipped = 1')
    const discovery = await createAiExtractSourceLoader(directory)(
      aiExtractConfig({
        sources: ['**/*.ts'],
        context: {
          exclude: [join(directory, 'ignored')],
          'max-files-per-batch': 10,
          'max-batches': 2,
        },
      }),
    )
    expect(discovery.filePaths).toStrictEqual([join(directory, 'orders.ts')])
  })

  it('resolves relative memory and prompt-append paths against the project root', async () => {
    const directory = tempDirectory()
    writeFileSync(join(directory, 'memory.md'), 'OrderPlaced publishes an event')
    writeFileSync(join(directory, 'instructions.md'), 'Prefer past-tense event names')
    const discovery = await createAiExtractSourceLoader(directory)(
      aiExtractConfig({
        sources: ['**/*.ts'],
        memory: 'memory.md',
        'prompt-append': 'instructions.md',
      }),
    )
    expect(discovery.memoryContent).toBe('OrderPlaced publishes an event')
    expect(discovery.promptAppendContent).toBe('Prefer past-tense event names')
    expect(discovery.missingPaths).toStrictEqual([])
  })

  it('reports resolved missing paths for relative memory and prompt-append files', async () => {
    const directory = tempDirectory()
    const discovery = await createAiExtractSourceLoader(directory)(
      aiExtractConfig({
        sources: ['**/*.ts'],
        memory: 'missing-memory.md',
        'prompt-append': 'missing-instructions.md',
      }),
    )
    expect(discovery.missingPaths).toStrictEqual([
      join(directory, 'missing-memory.md'),
      join(directory, 'missing-instructions.md'),
    ])
  })
})
