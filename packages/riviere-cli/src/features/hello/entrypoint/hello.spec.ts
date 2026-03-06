import {
  describe, it, expect 
} from 'vitest'
import { createProgram } from '../../../shell/cli'
import type { TestContext } from '../../../platform/__fixtures__/command-test-fixtures'
import {
  createTestContext,
  setupCommandTest,
} from '../../../platform/__fixtures__/command-test-fixtures'

describe('riviere hello', () => {
  describe('command registration', () => {
    it('registers hello as a top-level command', () => {
      const program = createProgram()
      const helloCmd = program.commands.find((cmd) => cmd.name() === 'hello')

      expect(helloCmd?.name()).toBe('hello')
    })

    it('describes hello command as say hello', () => {
      const program = createProgram()
      const helloCmd = program.commands.find((cmd) => cmd.name() === 'hello')

      expect(helloCmd?.description()).toBe('Say hello')
    })
  })

  describe('execution', () => {
    const ctx: TestContext = createTestContext()
    setupCommandTest(ctx)

    it('outputs hello when executed', async () => {
      await createProgram().parseAsync(['node', 'riviere', 'hello'])

      expect(ctx.consoleOutput).toStrictEqual(['hello'])
    })
  })
})
