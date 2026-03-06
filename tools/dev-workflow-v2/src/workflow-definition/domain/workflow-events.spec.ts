import {
  WORKFLOW_EVENT_SCHEMA, type WorkflowEvent 
} from './workflow-events'

const AT = '2026-01-01T00:00:00Z'

describe('WORKFLOW_EVENT_SCHEMA — session-started', () => {
  it('accepts valid payload', () => {
    const result: WorkflowEvent = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'session-started',
      at: AT,
    })
    expect(result.type).toStrictEqual('session-started')
  })

  it('accepts optional repository', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'session-started',
      at: AT,
      repository: 'owner/repo',
    })
    expect(result.type).toStrictEqual('session-started')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — issue-recorded', () => {
  it('accepts valid payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'issue-recorded',
      at: AT,
      issueNumber: 42,
    })
    expect(result.type).toStrictEqual('issue-recorded')
  })

  it('rejects missing issueNumber', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'issue-recorded',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — branch-recorded', () => {
  it('accepts valid payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'branch-recorded',
      at: AT,
      branch: 'feature/foo',
    })
    expect(result.type).toStrictEqual('branch-recorded')
  })

  it('rejects missing branch', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'branch-recorded',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — architecture-review-completed', () => {
  it('accepts passed payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'architecture-review-completed',
      at: AT,
      passed: true,
    })
    expect(result.type).toStrictEqual('architecture-review-completed')
  })

  it('rejects missing passed', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'architecture-review-completed',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — code-review-completed', () => {
  it('accepts passed payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'code-review-completed',
      at: AT,
      passed: true,
    })
    expect(result.type).toStrictEqual('code-review-completed')
  })

  it('rejects missing passed', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'code-review-completed',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — bug-scanner-completed', () => {
  it('accepts passed payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'bug-scanner-completed',
      at: AT,
      passed: true,
    })
    expect(result.type).toStrictEqual('bug-scanner-completed')
  })

  it('rejects missing passed', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'bug-scanner-completed',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — pr-recorded', () => {
  it('accepts valid payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'pr-recorded',
      at: AT,
      prNumber: 7,
    })
    expect(result.type).toStrictEqual('pr-recorded')
  })

  it('accepts optional prUrl', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'pr-recorded',
      at: AT,
      prNumber: 7,
      prUrl: 'https://github.com/x/y/pull/7',
    })
    expect(result.type).toStrictEqual('pr-recorded')
  })

  it('rejects missing prNumber', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'pr-recorded',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — ci-completed', () => {
  it('accepts passed payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'ci-completed',
      at: AT,
      passed: true,
    })
    expect(result.type).toStrictEqual('ci-completed')
  })

  it('accepts failed payload with output', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'ci-completed',
      at: AT,
      passed: false,
      output: 'test failures',
    })
    expect(result.type).toStrictEqual('ci-completed')
  })

  it('rejects missing passed', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'ci-completed',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — feedback-checked', () => {
  it('accepts clean payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'feedback-checked',
      at: AT,
      clean: true,
    })
    expect(result.type).toStrictEqual('feedback-checked')
  })

  it('accepts dirty payload with unresolvedCount', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'feedback-checked',
      at: AT,
      clean: false,
      unresolvedCount: 3,
    })
    expect(result.type).toStrictEqual('feedback-checked')
  })

  it('rejects missing clean', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'feedback-checked',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — feedback-addressed', () => {
  it('accepts valid payload with addressedCount', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'feedback-addressed',
      at: AT,
      addressedCount: 3,
    })
    expect(result.type).toStrictEqual('feedback-addressed')
  })

  it('rejects missing addressedCount', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'feedback-addressed',
        at: AT,
      }),
    ).toThrow('Required')
  })

  it('rejects missing at', () => {
    expect(() => WORKFLOW_EVENT_SCHEMA.parse({ type: 'feedback-addressed' })).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — reflection-written', () => {
  it('accepts valid payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'reflection-written',
      at: AT,
      path: '/test-output/r.md',
    })
    expect(result.type).toStrictEqual('reflection-written')
  })

  it('rejects missing path', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'reflection-written',
        at: AT,
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — task-check-passed', () => {
  it('accepts valid payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'task-check-passed',
      at: AT,
    })
    expect(result.type).toStrictEqual('task-check-passed')
  })

  it('rejects missing at', () => {
    expect(() => WORKFLOW_EVENT_SCHEMA.parse({ type: 'task-check-passed' })).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — bash-checked', () => {
  it('accepts valid payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'bash-checked',
      at: AT,
      tool: 'Bash',
      command: 'pnpm test',
      allowed: true,
    })
    expect(result.type).toStrictEqual('bash-checked')
  })

  it('accepts optional reason', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
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
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'bash-checked',
        at: AT,
        tool: 'Bash',
        allowed: true,
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — write-checked', () => {
  it('accepts valid payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'write-checked',
      at: AT,
      tool: 'Write',
      filePath: '/test-output/x.ts',
      allowed: true,
    })
    expect(result.type).toStrictEqual('write-checked')
  })

  it('accepts optional reason', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
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
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'write-checked',
        at: AT,
        tool: 'Write',
        allowed: true,
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — transitioned', () => {
  it('accepts valid payload', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
      type: 'transitioned',
      at: AT,
      from: 'IMPLEMENTING',
      to: 'REVIEWING',
    })
    expect(result.type).toStrictEqual('transitioned')
  })

  it('accepts optional preBlockedState', () => {
    const result = WORKFLOW_EVENT_SCHEMA.parse({
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
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'transitioned',
        at: AT,
        to: 'REVIEWING',
      }),
    ).toThrow('Required')
  })

  it('rejects missing to', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'transitioned',
        at: AT,
        from: 'IMPLEMENTING',
      }),
    ).toThrow('Required')
  })
})

describe('WORKFLOW_EVENT_SCHEMA — discriminant validation', () => {
  it('rejects unknown type discriminant', () => {
    expect(() =>
      WORKFLOW_EVENT_SCHEMA.parse({
        type: 'unknown-event',
        at: AT,
      }),
    ).toThrow('Invalid discriminator value')
  })

  it('rejects missing type field', () => {
    expect(() => WORKFLOW_EVENT_SCHEMA.parse({ at: AT })).toThrow('Invalid discriminator value')
  })

  it('rejects missing at when type is present', () => {
    expect(() => WORKFLOW_EVENT_SCHEMA.parse({ type: 'session-started' })).toThrow('Required')
  })
})
