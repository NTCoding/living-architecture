import { describe, expect, it } from 'vitest'
import { BlockerQuestion } from './blocker-question'

describe('BlockerQuestion', () => {
  it('keeps the question and the evidence', () => {
    const question = BlockerQuestion.parse({
      question: 'Reuse the existing port, or add a second one?',
      evidence: 'configuration already exposes assertSchemaConforms',
    })

    expect(question.question()).toBe('Reuse the existing port, or add a second one?')
    expect(question.evidence()).toBe('configuration already exposes assertSchemaConforms')
  })

  it('allows a question without evidence', () => {
    expect(BlockerQuestion.parse({ question: 'Which name?', evidence: null }).evidence()).toBeNull()
  })

  it('rejects an empty question', () => {
    expect(() => BlockerQuestion.parse({ question: ' ', evidence: null })).toThrow(
      'String must contain at least 1 character(s)',
    )
  })
})
