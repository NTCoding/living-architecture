import { describe, expect, it } from 'vitest'
import { ReviewerDefinition } from './reviewer-definitions'

describe('ReviewerDefinition', () => {
  it('parses a reviewer definition with a known review type', () => {
    const definition = ReviewerDefinition.parse({
      reviewType: 'code-review',
      agentInstructions: 'agents/code-review.md',
      version: '1',
    })

    expect(definition.reviewType).toBe('code-review')
    expect(definition.agentInstructions).toBe('agents/code-review.md')
    expect(definition.version).toBe('1')
  })

  it('parses a list of reviewer definitions', () => {
    const definitions = ReviewerDefinition.parseAll([
      {
        reviewType: 'architecture-review',
        agentInstructions: 'agents/architecture-review.md',
        version: '1',
      },
      { reviewType: 'bug-scanner', agentInstructions: 'agents/bug-scanner.md', version: '1' },
    ])

    expect(definitions.map((definition) => definition.reviewType)).toStrictEqual([
      'architecture-review',
      'bug-scanner',
    ])
  })

  it('rejects unknown review types', () => {
    expect(() =>
      ReviewerDefinition.parse({
        reviewType: 'code-rabbit',
        agentInstructions: 'agents/code-rabbit.md',
        version: '1',
      }),
    ).toThrow('Invalid enum value')
  })

  it('rejects definitions missing instructions or version', () => {
    expect(() => ReviewerDefinition.parse({ reviewType: 'code-review' })).toThrow(
      'agentInstructions',
    )
    expect(() =>
      ReviewerDefinition.parse({
        reviewType: 'code-review',
        agentInstructions: 'agents/code-review.md',
      }),
    ).toThrow('version')
  })

  it('rejects extra properties', () => {
    expect(() =>
      ReviewerDefinition.parse({
        reviewType: 'code-review',
        agentInstructions: 'agents/code-review.md',
        version: '1',
        findings: [],
      }),
    ).toThrow('Unrecognized key')
  })
})
