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
  parseSuccessOutput,
  hasSuccessOutputStructure,
  createGraphWithDomain,
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

  describe('component type validation', () => {
    it.each([
      ['invalid string', 'INVALID'],
      ['empty', ''],
      ['whitespace', '   '],
      ['special chars', 'UI<script>'],
      ['typo', 'UseCasee'],
    ])('returns VALIDATION_ERROR when componentType is %s', async (_label, value) => {
      await addComponent({
        ...inputWithGraphPath(),
        componentType: value,
      })

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.code).toBe(CliErrorCode.ValidationError)
      expect(output.error.message).toContain('Invalid component type')
    })
  })

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
    ])('valid lineNumber (%s) reaches graph check', async (_label, value) => {
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

  describe('successful component addition', () => {
    it('returns componentId for UI component in valid graph', async () => {
      await createGraphWithDomain(ctx.testDir, 'test-domain')

      await addComponent(inputWithGraphPath())

      const output = parseSuccessOutput(
        ctx.consoleOutput,
        hasSuccessOutputStructure,
        'Expected success output',
      )
      expect(output.success).toBe(true)
      expect(output.data).toHaveProperty('componentId')
    })
  })

  describe('domain not found error', () => {
    it('returns DOMAIN_NOT_FOUND when domain does not exist', async () => {
      await createGraphWithDomain(ctx.testDir, 'other-domain')

      await addComponent(inputWithGraphPath())

      const output = parseErrorOutput(ctx.consoleOutput)
      expect(output.error.code).toBe(CliErrorCode.DomainNotFound)
    })
  })
})
