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

  async function expectInvalidEnrichInput(fileName: string, content: string): Promise<void> {
    const enrichPath = join(ctx.testDir, fileName)
    await writeFile(enrichPath, content)

    await expect(
      parseCommandWithErrorHandling([
        'node', 'riviere', 'extract', '--config', 'extract.yaml', '--enrich', enrichPath,
      ]),
    ).rejects.toMatchObject({ exitCode: 2 })

    const output = parseErrorOutput(ctx.consoleOutput)
    expect(output.error.code).toBe(CliErrorCode.ValidationError)
    expect(output.error.message).toContain(fileName)
  }

  it('returns validation error when the enrich file is missing', async () => {
    const enrichPath = join(ctx.testDir, 'missing.json')

    await expect(
      parseCommandWithErrorHandling([
        'node', 'riviere', 'extract', '--config', 'extract.yaml', '--enrich', enrichPath,
      ]),
    ).rejects.toMatchObject({ exitCode: 2 })

    const output = parseErrorOutput(ctx.consoleOutput)
    expect(output.error.code).toBe(CliErrorCode.ValidationError)
    expect(output.error.message).toContain('missing.json')
  })

  it('returns validation error when the enrich file contains invalid JSON', async () => {
    await expectInvalidEnrichInput('invalid.json', '{')
  })

  it('returns validation error when the enrich file root is invalid', async () => {
    await expectInvalidEnrichInput('invalid-root.json', '{}')
  })

  it('returns validation error when a draft component is not an object', async () => {
    await expectInvalidEnrichInput('invalid-component.json', '[null]')
  })
})
