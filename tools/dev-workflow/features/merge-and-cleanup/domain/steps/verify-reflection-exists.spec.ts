import {
  describe, it, expect 
} from 'vitest'
import { createVerifyReflectionExistsStep } from './verify-reflection-exists'
import { buildContext } from './merge-cleanup-context-fixture'

describe('verify-reflection-exists', () => {
  it('succeeds when reflection file exists', async () => {
    const step = createVerifyReflectionExistsStep({ fileExists: async () => true })

    const result = await step.execute(buildContext())

    expect(result.type).toBe('success')
  })

  it('fails when reflection file does not exist', async () => {
    const step = createVerifyReflectionExistsStep({ fileExists: async () => false })

    const result = await step.execute(buildContext())

    expect(result.type).toBe('failure')
    expect(result.type === 'failure' && result.details).toStrictEqual({
      nextAction: 'run_reflection',
      nextInstructions: expect.stringContaining('/pre-merge-reflection'),
    })
  })

  it('includes the reflection file path in failure message', async () => {
    const step = createVerifyReflectionExistsStep({ fileExists: async () => false })

    const result = await step.execute(
      buildContext({ reflectionFilePath: 'reviews/custom/post-merge-reflection.md' }),
    )

    expect(result.type === 'failure' && result.details).toStrictEqual({
      nextAction: 'run_reflection',
      nextInstructions: expect.stringContaining('reviews/custom/post-merge-reflection.md'),
    })
  })

  it('handles path with spaces in failure message', async () => {
    const step = createVerifyReflectionExistsStep({ fileExists: async () => false })

    const result = await step.execute(
      buildContext({ reflectionFilePath: 'docs/path with spaces/reflection.md' }),
    )

    expect(result.type === 'failure' && result.details).toStrictEqual({
      nextAction: 'run_reflection',
      nextInstructions: expect.stringContaining('path with spaces'),
    })
  })

  it('handles path with unicode characters in failure message', async () => {
    const step = createVerifyReflectionExistsStep({ fileExists: async () => false })

    const result = await step.execute(
      buildContext({ reflectionFilePath: 'docs/réflection/file.md' }),
    )

    expect(result.type === 'failure' && result.details).toStrictEqual({
      nextAction: 'run_reflection',
      nextInstructions: expect.stringContaining('réflection'),
    })
  })
})
