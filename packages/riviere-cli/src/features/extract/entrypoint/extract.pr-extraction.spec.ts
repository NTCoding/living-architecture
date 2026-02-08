import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  describe, it, expect, vi 
} from 'vitest'
import type { TestContext } from '../../../platform/__fixtures__/command-test-fixtures'
import {
  createTestContext,
  setupCommandTest,
  parseErrorOutput,
  parseCommandWithErrorHandling,
} from '../../../platform/__fixtures__/command-test-fixtures'
import { CliErrorCode } from '../../../platform/infra/cli-presentation/error-codes'
import {
  parseExtractionOutput,
  parseFullExtractionOutput,
  createValidExtractFixture,
} from '../__fixtures__/extraction-test-fixtures'

vi.mock('../../../platform/infra/git/git-repository-info', () => ({
  getRepositoryInfo: vi.fn(() => ({
    name: 'test/repo',
    owner: 'test',
    url: 'https://github.com/test/repo.git',
  })),
}))

vi.mock('../../../platform/infra/git/git-changed-files', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../../platform/infra/git/git-changed-files')>()
  return {
    ...original,
    detectChangedTypeScriptFiles: vi.fn(),
  }
})

import {
  detectChangedTypeScriptFiles,
  GitError,
} from '../../../platform/infra/git/git-changed-files'

const mockDetectChanged = vi.mocked(detectChangedTypeScriptFiles)

describe('riviere extract PR extraction', () => {
  describe('flag mutual exclusivity', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it.each([
      {
        flags: ['--pr', '--files', 'some-file.ts'],
        expectedA: '--pr',
        expectedB: '--files',
      },
      {
        flags: ['--pr', '--enrich', 'draft.json'],
        expectedA: '--pr',
        expectedB: '--enrich',
      },
      {
        flags: ['--files', 'file.ts', '--enrich', 'draft.json'],
        expectedA: '--files',
        expectedB: '--enrich',
      },
    ])('rejects $expectedA and $expectedB together', async ({
      flags, expectedA, expectedB 
    }) => {
      const configPath = await createValidExtractFixture(ctx.testDir)

      await expect(
        parseCommandWithErrorHandling([
          'node',
          'riviere',
          'extract',
          '--config',
          configPath,
          ...flags,
        ]),
      ).rejects.toMatchObject({ exitCode: 2 })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.message).toContain(expectedA)
      expect(output.error.message).toContain(expectedB)
    })

    it('rejects --base without --pr', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)

      await expect(
        parseCommandWithErrorHandling([
          'node',
          'riviere',
          'extract',
          '--config',
          configPath,
          '--base',
          'develop',
        ]),
      ).rejects.toMatchObject({ exitCode: 2 })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.message).toContain('--base')
      expect(output.error.message).toContain('--pr')
    })
  })

  describe('format flag validation', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('rejects --format markdown without --pr or --files', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)

      await expect(
        parseCommandWithErrorHandling([
          'node',
          'riviere',
          'extract',
          '--config',
          configPath,
          '--format',
          'markdown',
        ]),
      ).rejects.toMatchObject({ exitCode: 2 })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.message).toContain('--format markdown')
      expect(output.error.message).toContain('--pr')
    })

    it('rejects invalid format value', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)

      await expect(
        parseCommandWithErrorHandling([
          'node',
          'riviere',
          'extract',
          '--config',
          configPath,
          '--format',
          'csv',
        ]),
      ).rejects.toMatchObject({ exitCode: 2 })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.message).toContain('csv')
      expect(output.error.message).toContain('json')
      expect(output.error.message).toContain('markdown')
    })
  })

  describe('--files flag', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('rejects when specified files do not exist', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)

      await expect(
        parseCommandWithErrorHandling([
          'node',
          'riviere',
          'extract',
          '--config',
          configPath,
          '--files',
          'nonexistent.ts',
        ]),
      ).rejects.toMatchObject({ exitCode: 2 })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.message).toContain('nonexistent.ts')
    })

    it('extracts components from specified files only', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)
      const sourceFile = join(ctx.testDir, 'src', 'order-service.ts')

      await parseCommandWithErrorHandling([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--files',
        sourceFile,
      ])

      const output = parseFullExtractionOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
      expect(output.data.components).toHaveLength(1)
      expect(output.data.components[0]).toMatchObject({
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'orders',
      })
    })

    it('returns empty when specified file is not in config glob', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)
      const outsideFile = join(ctx.testDir, 'outside.ts')
      await writeFile(outsideFile, 'export const x = 1')

      await parseCommandWithErrorHandling([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--files',
        outsideFile,
        '--components-only',
      ])

      const output = parseExtractionOutput(ctx.consoleOutput)
      expect(output.data).toHaveLength(0)
    })

    it('outputs markdown when --format markdown used with --files', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)
      const sourceFile = join(ctx.testDir, 'src', 'order-service.ts')

      await parseCommandWithErrorHandling([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--files',
        sourceFile,
        '--format',
        'markdown',
      ])

      const markdownOutput = ctx.consoleOutput.join('\n')
      expect(markdownOutput).toContain('## Architecture Changes')
      expect(markdownOutput).toContain('Added Components (1)')
      expect(markdownOutput).toContain('`PlaceOrder`')
    })
  })

  describe('--pr flag', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('handles git error when not in a git repo', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)
      mockDetectChanged.mockImplementation(() => {
        throw new GitError('NOT_A_REPOSITORY', 'Run from within a git repository.')
      })

      await expect(
        parseCommandWithErrorHandling([
          'node',
          'riviere',
          'extract',
          '--config',
          configPath,
          '--pr',
        ]),
      ).rejects.toMatchObject({ exitCode: 3 })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.code).toBe(CliErrorCode.GitNotARepository)
    })

    it('extracts components from changed files on feature branch', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)
      const sourceFile = join(ctx.testDir, 'src', 'order-service.ts')
      mockDetectChanged.mockReturnValue({
        files: [sourceFile],
        warnings: [],
      })

      await parseCommandWithErrorHandling([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--pr',
        '--base',
        'main',
        '--components-only',
      ])

      const output = parseExtractionOutput(ctx.consoleOutput)
      expect(output.success).toBe(true)
      expect(output.data).toHaveLength(1)
      expect(output.data[0]).toMatchObject({
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'orders',
      })
    })

    it('warns about untracked TypeScript files', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)
      const sourceFile = join(ctx.testDir, 'src', 'order-service.ts')
      mockDetectChanged.mockReturnValue({
        files: [sourceFile],
        warnings: ['1 untracked TypeScript file(s) not included: untracked.ts'],
      })

      const stderrOutput: string[] = []
      const errorSpy = vi.spyOn(console, 'error').mockImplementation((msg: string) => {
        stderrOutput.push(String(msg))
      })

      await parseCommandWithErrorHandling([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--pr',
        '--base',
        'main',
        '--components-only',
      ])

      errorSpy.mockRestore()

      expect(stderrOutput.some((msg) => msg.includes('untracked'))).toBe(true)
    })

    it('outputs markdown format for --pr with --format markdown', async () => {
      const configPath = await createValidExtractFixture(ctx.testDir)
      const sourceFile = join(ctx.testDir, 'src', 'order-service.ts')
      mockDetectChanged.mockReturnValue({
        files: [sourceFile],
        warnings: [],
      })

      await parseCommandWithErrorHandling([
        'node',
        'riviere',
        'extract',
        '--config',
        configPath,
        '--pr',
        '--base',
        'main',
        '--format',
        'markdown',
      ])

      const markdownOutput = ctx.consoleOutput.join('\n')
      expect(markdownOutput).toContain('## Architecture Changes')
      expect(markdownOutput).toContain('`PlaceOrder`')
    })
  })
})
