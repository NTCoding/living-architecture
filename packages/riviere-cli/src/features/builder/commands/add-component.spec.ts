import {
  writeFile, mkdir 
} from 'node:fs/promises'
import { join } from 'node:path'
import {
  describe, expect, it 
} from 'vitest'
import { addComponent } from './add-component'
import { CliErrorCode } from '../../../platform/infra/cli-presentation/error-codes'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
  parseErrorOutput,
} from '../../../platform/__fixtures__/command-test-fixtures'

describe('addComponent command', () => {
  const ctx: TestContext = createTestContext()
  setupCommandTest(ctx)

  const baseInput = {
    componentType: 'UI',
    name: 'TestComponent',
    domain: 'test-domain',
    module: 'test-module',
    repository: 'test-repo',
    filePath: '/path/to/file.ts',
    outputJson: true,
  }

  function inputWithGraphPath(overrides: Partial<typeof baseInput> = {}) {
    return {
      ...baseInput,
      graphPath: join(ctx.testDir, '.riviere', 'graph.json'),
      route: '/test',
      ...overrides,
    }
  }

  describe('line number validation', () => {
    it('returns VALIDATION_ERROR when lineNumber is NaN', async () => {
      await addComponent({
        ...inputWithGraphPath(),
        lineNumber: NaN,
      })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.code).toBe(CliErrorCode.ValidationError)
      expect(output.error.message).toContain('Invalid line number')
    })

    it('returns VALIDATION_ERROR when lineNumber is Infinity', async () => {
      await addComponent({
        ...inputWithGraphPath(),
        lineNumber: Infinity,
      })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.code).toBe(CliErrorCode.ValidationError)
      expect(output.error.message).toContain('Invalid line number')
    })

    it('accepts valid lineNumber and proceeds to graph check', async () => {
      await addComponent({
        ...inputWithGraphPath(),
        lineNumber: 42,
      })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.code).toBe(CliErrorCode.GraphNotFound)
    })
  })

  describe('malformed JSON handling', () => {
    it('returns VALIDATION_ERROR when graph file contains invalid JSON', async () => {
      const graphDir = join(ctx.testDir, '.riviere')
      await mkdir(graphDir, { recursive: true })
      await writeFile(join(graphDir, 'graph.json'), 'not valid json {{{', 'utf-8')

      await addComponent(inputWithGraphPath())

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.code).toBe(CliErrorCode.ValidationError)
      expect(output.error.message).toContain('invalid JSON')
    })
  })
})
