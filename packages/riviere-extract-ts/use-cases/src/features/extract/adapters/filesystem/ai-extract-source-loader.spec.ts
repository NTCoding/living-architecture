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
  it('loads matched source files with contents in deterministic order plus configured optional files', async () => {
    const directory = tempDirectory()
    writeFileSync(join(directory, 'b-orders.ts'), 'export const orders = 1')
    writeFileSync(join(directory, 'a-billing.ts'), 'export const billing = 2')
    writeFileSync(join(directory, 'memory.md'), 'OrderPlaced publishes an event')
    writeFileSync(join(directory, 'instructions.md'), 'Prefer past-tense event names')
    const loader = createAiExtractSourceLoader(directory)
    const bundle = await loader(
      aiExtractConfig({
        sources: ['**/*.ts'],
        memory: join(directory, 'memory.md'),
        'prompt-append': join(directory, 'instructions.md'),
      }),
    )
    expect(bundle.files).toStrictEqual([
      { filePath: join(directory, 'a-billing.ts'), content: 'export const billing = 2' },
      { filePath: join(directory, 'b-orders.ts'), content: 'export const orders = 1' },
    ])
    expect(bundle.memoryContent).toBe('OrderPlaced publishes an event')
    expect(bundle.promptAppendContent).toBe('Prefer past-tense event names')
    expect(bundle.missingPaths).toStrictEqual([])
  })

  it('resolves relative sources and excludes against the project root', async () => {
    const directory = tempDirectory()
    mkdirSync(join(directory, 'src', 'ignored'), { recursive: true })
    writeFileSync(join(directory, 'src', 'orders.ts'), 'export const orders = 1')
    writeFileSync(join(directory, 'src', 'ignored', 'skipped.ts'), 'export const skipped = 1')
    const bundle = await createAiExtractSourceLoader(directory)(
      aiExtractConfig({
        sources: ['src'],
        context: { exclude: ['src/ignored'], 'max-files-per-batch': 10, 'max-batches': 2 },
      }),
    )
    expect(bundle.files).toStrictEqual([
      { filePath: join(directory, 'src', 'orders.ts'), content: 'export const orders = 1' },
    ])
    expect(bundle.memoryContent).toBeUndefined()
    expect(bundle.promptAppendContent).toBeUndefined()
  })

  it('loads a file matched by more than one source pattern once', async () => {
    const directory = tempDirectory()
    writeFileSync(join(directory, 'orders.ts'), 'export const orders = 1')
    const bundle = await createAiExtractSourceLoader(directory)(
      aiExtractConfig({ sources: ['orders.ts', '*.ts'] }),
    )
    expect(bundle.files).toStrictEqual([
      { filePath: join(directory, 'orders.ts'), content: 'export const orders = 1' },
    ])
  })

  it('reports configured paths that do not exist instead of throwing', async () => {
    const directory = tempDirectory()
    const missingSource = join(directory, 'missing.ts')
    const missingMemory = join(directory, 'missing-memory.md')
    const missingInstructions = join(directory, 'missing-instructions.md')
    const bundle = await createAiExtractSourceLoader(directory)(
      aiExtractConfig({
        sources: [missingSource],
        memory: missingMemory,
        'prompt-append': missingInstructions,
      }),
    )
    expect(bundle.files).toStrictEqual([])
    expect(bundle.missingPaths).toStrictEqual([missingSource, missingMemory, missingInstructions])
  })

  it('accepts an absolute exclude pattern', async () => {
    const directory = tempDirectory()
    mkdirSync(join(directory, 'ignored'), { recursive: true })
    writeFileSync(join(directory, 'orders.ts'), 'export const orders = 1')
    writeFileSync(join(directory, 'ignored', 'skipped.ts'), 'export const skipped = 1')
    const bundle = await createAiExtractSourceLoader(directory)(
      aiExtractConfig({
        sources: ['**/*.ts'],
        context: {
          exclude: [join(directory, 'ignored')],
          'max-files-per-batch': 10,
          'max-batches': 2,
        },
      }),
    )
    expect(bundle.files).toStrictEqual([
      { filePath: join(directory, 'orders.ts'), content: 'export const orders = 1' },
    ])
  })
})
