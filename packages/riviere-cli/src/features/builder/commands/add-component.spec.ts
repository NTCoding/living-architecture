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
    it.each([
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['negative Infinity', -Infinity],
      ['fractional', 3.14],
      ['negative', -1],
      ['zero', 0],
    ])('returns VALIDATION_ERROR when lineNumber is %s', async (_label, value) => {
      await addComponent({
        ...inputWithGraphPath(),
        lineNumber: value,
      })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.code).toBe(CliErrorCode.ValidationError)
      expect(output.error.message).toContain('Invalid line number')
    })

    it.each([
      ['small positive', 1],
      ['typical', 42],
      ['large', Number.MAX_SAFE_INTEGER],
    ])('accepts valid lineNumber (%s) and proceeds to graph check', async (_label, value) => {
      await addComponent({
        ...inputWithGraphPath(),
        lineNumber: value,
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
