import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  parseAiExtractConfig,
  type AiExtractConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import { FileReadError } from '../../../../infra/external-clients/filesystem/file-reader'
import { createAiExtractSourceLoader } from './create-ai-extract-source-loader'

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
  it('loads matched source files with contents in deterministic order plus configured optional files', () => {
    const directory = tempDirectory()
    writeFileSync(join(directory, 'b-orders.ts'), 'export const orders = 1')
    writeFileSync(join(directory, 'a-billing.ts'), 'export const billing = 2')
    writeFileSync(join(directory, 'memory.md'), 'suppress: orders:ordering:Event:order-placed')
    writeFileSync(join(directory, 'instructions.md'), 'Prefer past-tense event names')
    const loader = createAiExtractSourceLoader()
    const result = loader(
      aiExtractConfig({
        sources: [join(directory, '**', '*.ts')],
        memory: join(directory, 'memory.md'),
        'prompt-append': join(directory, 'instructions.md'),
      }),
    )
    expect(result.files).toStrictEqual([
      { path: join(directory, 'a-billing.ts'), content: 'export const billing = 2' },
      { path: join(directory, 'b-orders.ts'), content: 'export const orders = 1' },
    ])
    expect(result.memory).toBe('suppress: orders:ordering:Event:order-placed')
    expect(result.promptAppend).toBe('Prefer past-tense event names')
  })

  it('returns no memory or prompt-append when the configuration omits them', () => {
    const result = createAiExtractSourceLoader()(
      aiExtractConfig({ sources: [join(tempDirectory(), '**', '*')] }),
    )
    expect(result.files).toStrictEqual([])
    expect(result.memory).toBeUndefined()
    expect(result.promptAppend).toBeUndefined()
  })

  it('fails when a configured AI stage file does not exist', () => {
    const missingMemory = join(tmpdir(), 'missing-ai-extract-memory.md')
    const loader = createAiExtractSourceLoader()
    expect(() =>
      loader(
        aiExtractConfig({
          sources: [join(tempDirectory(), '**', '*')],
          memory: missingMemory,
        }),
      ),
    ).toThrow(new FileReadError(`Configured AI stage file does not exist: ${missingMemory}`))
  })

  it('delegates source discovery to the injected finder and reads the returned files', () => {
    const directory = tempDirectory()
    const source = join(directory, 'orders.ts')
    writeFileSync(source, 'export const orders = 1')
    const findFiles = vi.fn(() => [source])
    const result = createAiExtractSourceLoader(findFiles)(
      aiExtractConfig({
        sources: ['./src'],
        context: { exclude: ['./src/skip'], 'max-files-per-batch': 10, 'max-batches': 2 },
      }),
    )
    expect(findFiles).toHaveBeenCalledWith(['./src'], ['./src/skip'])
    expect(result.files).toStrictEqual([{ path: source, content: 'export const orders = 1' }])
  })

  it('fails before reading when discovered files exceed the configured bound', () => {
    const directory = tempDirectory()
    writeFileSync(join(directory, 'a.ts'), 'export const a = 1')
    writeFileSync(join(directory, 'b.ts'), 'export const b = 2')
    writeFileSync(join(directory, 'c.ts'), 'export const c = 3')
    const loader = createAiExtractSourceLoader()
    expect(() =>
      loader(
        aiExtractConfig({
          sources: [join(directory, '**', '*.ts')],
          context: { exclude: [], 'max-files-per-batch': 1, 'max-batches': 2 },
        }),
      ),
    ).toThrow(
      new FileReadError(
        `ai-extract: source scope produced 3 files, exceeds bound (max-files-per-batch * max-batches = 2). Narrow 'sources' or raise the bounds explicitly.`,
        'AI_EXTRACT_SOURCE_BOUND_EXCEEDED',
      ),
    )
  })
})
