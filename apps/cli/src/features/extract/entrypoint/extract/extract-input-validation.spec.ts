import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CliErrorCode } from '../../../../infra/cli/presentation/error-codes'
import {
  createTestContext,
  parseCommandWithErrorHandling,
  parseErrorOutput,
  setupCommandTest,
  type TestContext,
} from '../../../../__fixtures__/command-test-fixtures'

describe('riviere extract input validation', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  it('returns validation error when an explicit source file is missing', async () => {
    await expect(
      parseCommandWithErrorHandling([
        'node', 'riviere', 'extract', '--config', 'extract.yaml', '--files', 'missing.ts',
      ]),
    ).rejects.toMatchObject({ exitCode: 2 })

    const output = parseErrorOutput(ctx.consoleOutput)
    expect(output.error.code).toBe(CliErrorCode.ValidationError)
    expect(output.error.message).toContain('missing.ts')
  })

  it.each([
    ['missing.json', undefined],
    ['invalid.json', '{'],
    ['invalid-root.json', '{}'],
  ])('returns validation error for enrich input %s', async (fileName, content) => {
    const enrichPath = join(ctx.testDir, fileName)
    if (content !== undefined) await writeFile(enrichPath, content)

    await expect(
      parseCommandWithErrorHandling([
        'node', 'riviere', 'extract', '--config', 'extract.yaml', '--enrich', enrichPath,
      ]),
    ).rejects.toMatchObject({ exitCode: 2 })

    const output = parseErrorOutput(ctx.consoleOutput)
    expect(output.error.code).toBe(CliErrorCode.ValidationError)
    expect(output.error.message).toContain(fileName)
  })
})
