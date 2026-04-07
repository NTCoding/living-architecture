import {
  writeFile, mkdir 
} from 'node:fs/promises'
import { join } from 'node:path'
import {
  describe, expect, it 
} from 'vitest'
import { AddComponent } from './add-component'
import { RiviereBuilderRepository } from '../infra/persistence/riviere-builder-repository'
import type { AddComponentErrorCode } from './add-component-result'
import {
  type TestContext,
  createTestContext,
  setupCommandTest,
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
  }

  function inputWithGraphPath(overrides: Partial<typeof baseInput> = {}) {
    return {
      ...baseInput,
      graphPathOption: join(ctx.testDir, '.riviere', 'graph.json'),
      route: '/test',
      ...overrides,
    }
  }

  function failureShape(code: AddComponentErrorCode) {
    return {
      success: false as const,
      code,
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
      const result = new AddComponent(new RiviereBuilderRepository()).execute({
        ...inputWithGraphPath(),
        componentType: value,
      })

      expect(result).toMatchObject({
        ...failureShape('VALIDATION_ERROR'),
        message: expect.stringContaining('Invalid component type'),
      })
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
      const result = new AddComponent(new RiviereBuilderRepository()).execute({
        ...inputWithGraphPath(),
        lineNumber: value,
      })

      expect(result).toMatchObject({
        ...failureShape('VALIDATION_ERROR'),
        message: expect.stringContaining('Invalid line number'),
      })
    })

    it.each([
      ['small positive', 1],
      ['typical', 42],
      ['large', Number.MAX_SAFE_INTEGER],
    ])('valid lineNumber (%s) reaches graph check', async (_label, value) => {
      const result = new AddComponent(new RiviereBuilderRepository()).execute({
        ...inputWithGraphPath(),
        lineNumber: value,
      })

      expect(result).toMatchObject(failureShape('GRAPH_NOT_FOUND'))
    })
  })

  describe('malformed JSON handling', () => {
    it('returns VALIDATION_ERROR when graph file contains invalid JSON', async () => {
      const graphDir = join(ctx.testDir, '.riviere')
      await mkdir(graphDir, { recursive: true })
      await writeFile(join(graphDir, 'graph.json'), 'not valid json {{{', 'utf-8')

      const result = new AddComponent(new RiviereBuilderRepository()).execute(inputWithGraphPath())

      expect(result).toMatchObject({
        ...failureShape('VALIDATION_ERROR'),
        message: expect.stringContaining('invalid JSON'),
      })
    })
  })

  describe('successful component addition', () => {
    it('returns componentId for UI component in valid graph', async () => {
      await createGraphWithDomain(ctx.testDir, 'test-domain')

      const result = new AddComponent(new RiviereBuilderRepository()).execute(inputWithGraphPath())

      expect(result).toMatchObject({
        success: true,
        componentId: expect.any(String),
      })
    })
  })

  describe('domain not found error', () => {
    it('returns DOMAIN_NOT_FOUND when domain does not exist', async () => {
      await createGraphWithDomain(ctx.testDir, 'other-domain')

      const result = new AddComponent(new RiviereBuilderRepository()).execute(inputWithGraphPath())

      expect(result).toMatchObject(failureShape('DOMAIN_NOT_FOUND'))
    })
  })
})
