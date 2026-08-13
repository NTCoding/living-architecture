import { parseWorkflowEvent, type WorkflowEvent } from './workflow-events'

const AT = '2026-01-01T00:00:00Z'

describe('parseWorkflowEvent — session-started', () => {
  it('accepts valid payload', () => {
    const result: WorkflowEvent = parseWorkflowEvent({
      type: 'session-started',
      at: AT,
    })
    expect(result.type).toStrictEqual('session-started')
  })

  it('accepts optional repository', () => {
    const result = parseWorkflowEvent({
      type: 'session-started',
      at: AT,
      repository: 'owner/repo',
    })
    expect(result.type).toStrictEqual('session-started')
  })
})

describe('parseWorkflowEvent — issue-recorded', () => {
  it('accepts valid payload', () => {
    const result = parseWorkflowEvent({
      type: 'issue-recorded',
      at: AT,
      issueNumber: 42,
    })
    expect(result.type).toStrictEqual('issue-recorded')
  })

  it('rejects missing issueNumber', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'issue-recorded',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('parseWorkflowEvent — branch-recorded', () => {
  it('accepts valid payload', () => {
    const result = parseWorkflowEvent({
      type: 'branch-recorded',
      at: AT,
      branch: 'feature/foo',
    })
    expect(result.type).toStrictEqual('branch-recorded')
  })

  it('rejects missing branch', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'branch-recorded',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('parseWorkflowEvent — architecture-review-completed', () => {
  it('accepts passed payload', () => {
    const result = parseWorkflowEvent({
      type: 'architecture-review-completed',
      at: AT,
      passed: true,
    })
    expect(result.type).toStrictEqual('architecture-review-completed')
  })

  it('rejects missing passed', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'architecture-review-completed',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('parseWorkflowEvent — code-review-completed', () => {
  it('accepts passed payload', () => {
    const result = parseWorkflowEvent({
      type: 'code-review-completed',
      at: AT,
      passed: true,
    })
    expect(result.type).toStrictEqual('code-review-completed')
  })

  it('rejects missing passed', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'code-review-completed',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('parseWorkflowEvent — bug-scanner-completed', () => {
  it('accepts passed payload', () => {
    const result = parseWorkflowEvent({
      type: 'bug-scanner-completed',
      at: AT,
      passed: true,
    })
    expect(result.type).toStrictEqual('bug-scanner-completed')
  })

  it('rejects missing passed', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'bug-scanner-completed',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('parseWorkflowEvent — pr-recorded', () => {
  it('accepts valid payload', () => {
    const result = parseWorkflowEvent({
      type: 'pr-recorded',
      at: AT,
      prNumber: 7,
    })
    expect(result.type).toStrictEqual('pr-recorded')
  })

  it('accepts optional prUrl', () => {
    const result = parseWorkflowEvent({
      type: 'pr-recorded',
      at: AT,
      prNumber: 7,
      prUrl: 'https://github.com/x/y/pull/7',
    })
    expect(result.type).toStrictEqual('pr-recorded')
  })

  it('rejects missing prNumber', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'pr-recorded',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('parseWorkflowEvent — ci-completed', () => {
  it('accepts passed payload', () => {
    const result = parseWorkflowEvent({
      type: 'ci-completed',
      at: AT,
      passed: true,
    })
    expect(result.type).toStrictEqual('ci-completed')
  })

  it('accepts failed payload with output', () => {
    const result = parseWorkflowEvent({
      type: 'ci-completed',
      at: AT,
      passed: false,
      output: 'test failures',
    })
    expect(result.type).toStrictEqual('ci-completed')
  })

  it('rejects missing passed', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'ci-completed',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('parseWorkflowEvent — feedback-checked', () => {
  it('accepts clean payload', () => {
    const result = parseWorkflowEvent({
      type: 'feedback-checked',
      at: AT,
      clean: true,
    })
    expect(result.type).toStrictEqual('feedback-checked')
  })

  it('accepts dirty payload with unresolvedCount', () => {
    const result = parseWorkflowEvent({
      type: 'feedback-checked',
      at: AT,
      clean: false,
      unresolvedCount: 3,
      reviewDecision: 'CHANGES_REQUESTED',
    })
    expect(result.type).toStrictEqual('feedback-checked')
  })

  it('accepts dirty payload with null reviewDecision', () => {
    const result = parseWorkflowEvent({
      type: 'feedback-checked',
      at: AT,
      clean: false,
      unresolvedCount: 0,
      reviewDecision: null,
    })
    expect(result.type).toStrictEqual('feedback-checked')
  })

  it('rejects missing clean', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'feedback-checked',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('parseWorkflowEvent — feedback-addressed', () => {
  it('accepts valid payload', () => {
    const result = parseWorkflowEvent({
      type: 'feedback-addressed',
      at: AT,
    })
    expect(result.type).toStrictEqual('feedback-addressed')
  })

  it('rejects missing at', () => {
    const malformedEvent = { type: 'feedback-addressed', at: AT }
    Reflect.deleteProperty(malformedEvent, 'at')

    expect(() => parseWorkflowEvent(malformedEvent)).toThrow('Required')
  })
})

describe('parseWorkflowEvent — task-check-passed', () => {
  it('accepts valid payload', () => {
    const result = parseWorkflowEvent({
      type: 'task-check-passed',
      at: AT,
    })
    expect(result.type).toStrictEqual('task-check-passed')
  })

  it('rejects missing at', () => {
    const malformedEvent = { type: 'task-check-passed', at: AT }
    Reflect.deleteProperty(malformedEvent, 'at')

    expect(() => parseWorkflowEvent(malformedEvent)).toThrow('Required')
  })
})

describe('parseWorkflowEvent — review-recorded', () => {
  it('accepts pass verdict payload', () => {
    const result = parseWorkflowEvent({
      type: 'review-recorded',
      at: AT,
      reviewId: 1,
      reviewType: 'task-check',
      verdict: 'PASS',
    })
    expect(result.type).toStrictEqual('review-recorded')
  })

  it('accepts fail verdict payload', () => {
    const result = parseWorkflowEvent({
      type: 'review-recorded',
      at: AT,
      reviewId: 2,
      reviewType: 'code-review',
      verdict: 'FAIL',
    })
    expect(result.type).toStrictEqual('review-recorded')
  })

  it('rejects missing reviewType', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'review-recorded',
        at: AT,
        reviewId: 1,
        verdict: 'PASS',
      }),
    ).toThrow('Required')
  })

  it('rejects unknown verdict', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'review-recorded',
        at: AT,
        reviewId: 1,
        reviewType: 'task-check',
        verdict: 'MAYBE',
      }),
    ).toThrow('Invalid enum value')
  })
})

describe('parseWorkflowEvent — bash-checked', () => {
  it('accepts valid payload', () => {
    const result = parseWorkflowEvent({
      type: 'bash-checked',
      at: AT,
      tool: 'Bash',
      command: 'pnpm test',
      allowed: true,
    })
    expect(result.type).toStrictEqual('bash-checked')
  })

  it('accepts optional reason', () => {
    const result = parseWorkflowEvent({
      type: 'bash-checked',
      at: AT,
      tool: 'Bash',
      command: 'git push',
      allowed: false,
      reason: 'forbidden',
    })
    expect(result.type).toStrictEqual('bash-checked')
  })

  it('rejects missing command', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'bash-checked',
        at: AT,
        tool: 'Bash',
        allowed: true,
      }),
    ).toThrow('Required')
  })
})

describe('parseWorkflowEvent — write-checked', () => {
  it('accepts valid payload', () => {
    const result = parseWorkflowEvent({
      type: 'write-checked',
      at: AT,
      tool: 'Write',
      filePath: '/test-output/x.ts',
      allowed: true,
    })
    expect(result.type).toStrictEqual('write-checked')
  })

  it('accepts optional reason', () => {
    const result = parseWorkflowEvent({
      type: 'write-checked',
      at: AT,
      tool: 'Write',
      filePath: '/test-output/x.ts',
      allowed: false,
      reason: 'blocked',
    })
    expect(result.type).toStrictEqual('write-checked')
  })

  it('rejects missing filePath', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'write-checked',
        at: AT,
        tool: 'Write',
        allowed: true,
      }),
    ).toThrow('Required')
  })
})

describe('parseWorkflowEvent — transitioned', () => {
  it('accepts valid payload', () => {
    const result = parseWorkflowEvent({
      type: 'transitioned',
      at: AT,
      from: 'IMPLEMENTING',
      to: 'REVIEWING',
    })
    expect(result.type).toStrictEqual('transitioned')
  })

  it('accepts optional preBlockedState', () => {
    const result = parseWorkflowEvent({
      type: 'transitioned',
      at: AT,
      from: 'IMPLEMENTING',
      to: 'BLOCKED',
      preBlockedState: 'IMPLEMENTING',
    })
    expect(result.type).toStrictEqual('transitioned')
  })

  it('rejects missing from', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'transitioned',
        at: AT,
        to: 'REVIEWING',
      }),
    ).toThrow('Required')
  })

  it('rejects missing to', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'transitioned',
        at: AT,
        from: 'IMPLEMENTING',
      }),
    ).toThrow('Required')
  })
})

describe('parseWorkflowEvent — discriminant validation', () => {
  it('rejects unknown type discriminant', () => {
    expect(() =>
      parseWorkflowEvent({
        type: 'unknown-event',
        at: AT,
      }),
    ).toThrow('Invalid discriminator value')
  })

  it('rejects missing type field', () => {
    const malformedEvent = { type: 'session-started', at: AT }
    Reflect.deleteProperty(malformedEvent, 'type')

    expect(() => parseWorkflowEvent(malformedEvent)).toThrow('Invalid discriminator value')
  })

  it('rejects missing at when type is present', () => {
    const malformedEvent = { type: 'session-started', at: AT }
    Reflect.deleteProperty(malformedEvent, 'at')

    expect(() => parseWorkflowEvent(malformedEvent)).toThrow('Required')
  })
})
