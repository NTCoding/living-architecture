import { parsePullRequestDescriptionOptions } from './pull-request-description-input'

const VALID_DESCRIPTION = 'A'.repeat(100)

const VALID_CREATE_PR_OPTIONS = [
  '--commit-type',
  'feat',
  '--commit-scope',
  'workflow',
  '--title',
  'Ready PR',
  '--description',
  VALID_DESCRIPTION,
  '--problem',
  'Direct PR creation could bypass workflow rules.',
  '--acceptance-criteria',
  '- PR body follows the standard structure.',
  '--key-changes',
  '- Add structured PR creation.',
  '--architecture-impact',
  'Workflow owns PR body construction.',
  '--validation',
  '- pnpm test',
  '--notes',
  'None.',
] as const

const VALID_PULL_REQUEST_DESCRIPTION_INPUT = {
  commitType: 'feat',
  commitScope: 'workflow',
  title: 'Ready PR',
  description: VALID_DESCRIPTION,
  problem: 'Direct PR creation could bypass workflow rules.',
  acceptanceCriteria: '- PR body follows the standard structure.',
  keyChanges: '- Add structured PR creation.',
  architectureImpact: 'Workflow owns PR body construction.',
  validation: '- pnpm test',
  notes: 'None.',
} as const

describe('parsePullRequestDescriptionOptions', () => {
  it('returns structured input when all required options are present', () => {
    const result = parsePullRequestDescriptionOptions(VALID_CREATE_PR_OPTIONS)

    expect(result).toStrictEqual({
      ok: true,
      input: VALID_PULL_REQUEST_DESCRIPTION_INPUT,
    })
  })

  it('handles flag-like values in value positions', () => {
    const result = parsePullRequestDescriptionOptions([
      '--commit-type',
      'feat',
      '--commit-scope',
      'workflow',
      '--title',
      '--description',
      '--description',
      VALID_DESCRIPTION,
      '--problem',
      'Direct PR creation could bypass workflow rules.',
      '--acceptance-criteria',
      '- PR body follows the standard structure.',
      '--key-changes',
      '- Add structured PR creation.',
      '--architecture-impact',
      'Workflow owns PR body construction.',
      '--validation',
      '- pnpm test',
      '--notes',
      'None.',
    ])

    expect(result).toStrictEqual({
      ok: true,
      input: {
        ...VALID_PULL_REQUEST_DESCRIPTION_INPUT,
        title: '--description',
      },
    })
  })

  it('returns failure when arguments are not strings', () => {
    const result = parsePullRequestDescriptionOptions([123])

    expect(result).toStrictEqual({
      ok: false,
      reason: 'Expected create-pr arguments to be option/value string pairs.',
    })
  })

  it('returns failure when no options are provided', () => {
    const result = parsePullRequestDescriptionOptions([])

    expect(result).toStrictEqual({
      ok: false,
      reason:
        'Expected create-pr options: --commit-type, --commit-scope, --title, --description, --problem, --acceptance-criteria, --key-changes, --architecture-impact, --validation, --notes.',
    })
  })

  it('returns failure when option has no value', () => {
    const result = parsePullRequestDescriptionOptions(['--title'])

    expect(result).toStrictEqual({
      ok: false,
      reason: 'Expected value after --title.',
    })
  })

  it('returns failure when option is unknown', () => {
    const result = parsePullRequestDescriptionOptions(['--draft', 'true'])

    expect(result).toStrictEqual({
      ok: false,
      reason:
        'Unknown create-pr option --draft. Allowed options: --commit-type, --commit-scope, --title, --description, --problem, --acceptance-criteria, --key-changes, --architecture-impact, --validation, --notes.',
    })
  })

  it('returns failure when option is duplicated', () => {
    const result = parsePullRequestDescriptionOptions(['--title', 'First', '--title', 'Second'])

    expect(result).toStrictEqual({
      ok: false,
      reason: 'Duplicate create-pr option --title.',
    })
  })

  it('returns failure when commit type is missing', () => {
    const missingCommitTypeOptions = VALID_CREATE_PR_OPTIONS.slice(2)

    expect(parsePullRequestDescriptionOptions(missingCommitTypeOptions)).toStrictEqual({
      ok: false,
      reason: 'Missing required create-pr option --commit-type.',
    })
  })

  it('returns failure when commit scope is missing', () => {
    const result = parsePullRequestDescriptionOptions([
      ...VALID_CREATE_PR_OPTIONS.slice(0, 2),
      ...VALID_CREATE_PR_OPTIONS.slice(4),
    ])

    expect(result).toStrictEqual({
      ok: false,
      reason: 'Missing required create-pr option --commit-scope.',
    })
  })

  it('returns failure when commit scope value is empty', () => {
    const result = parsePullRequestDescriptionOptions([
      '--commit-type',
      'feat',
      '--commit-scope',
      '',
      ...VALID_CREATE_PR_OPTIONS.slice(4),
    ])

    expect(result).toStrictEqual({
      ok: false,
      reason: 'Expected non-empty value for --commit-scope.',
    })
  })

  it('returns failure when required option is missing', () => {
    const result = parsePullRequestDescriptionOptions([
      '--commit-type',
      'feat',
      '--commit-scope',
      'workflow',
      '--description',
      'Creates a ready PR.',
      '--problem',
      'Direct PR creation could bypass workflow rules.',
      '--acceptance-criteria',
      '- PR body follows the standard structure.',
      '--key-changes',
      '- Add structured PR creation.',
      '--architecture-impact',
      'Workflow owns PR body construction.',
      '--validation',
      '- pnpm test',
      '--notes',
      'None.',
    ])

    expect(result).toStrictEqual({
      ok: false,
      reason: 'Missing required create-pr option --title.',
    })
  })

  it('returns failure when description is missing', () => {
    const result = parsePullRequestDescriptionOptions([
      '--commit-type',
      'feat',
      '--commit-scope',
      'workflow',
      '--title',
      'Ready PR',
      '--problem',
      'Direct PR creation could bypass workflow rules.',
      '--acceptance-criteria',
      '- PR body follows the standard structure.',
      '--key-changes',
      '- Add structured PR creation.',
      '--architecture-impact',
      'Workflow owns PR body construction.',
      '--validation',
      '- pnpm test',
      '--notes',
      'None.',
    ])

    expect(result).toStrictEqual({
      ok: false,
      reason: 'Missing required create-pr option --description.',
    })
  })

  it('returns failure when required option value is empty', () => {
    const result = parsePullRequestDescriptionOptions([
      '--commit-type',
      'feat',
      '--commit-scope',
      'workflow',
      '--title',
      '',
      '--description',
      'Creates a ready PR.',
      '--problem',
      'Direct PR creation could bypass workflow rules.',
      '--acceptance-criteria',
      '- PR body follows the standard structure.',
      '--key-changes',
      '- Add structured PR creation.',
      '--architecture-impact',
      'Workflow owns PR body construction.',
      '--validation',
      '- pnpm test',
      '--notes',
      'None.',
    ])

    expect(result).toStrictEqual({
      ok: false,
      reason: 'Expected non-empty value for --title.',
    })
  })

  it('returns failure when a required option value is whitespace only', () => {
    const result = parsePullRequestDescriptionOptions([
      '--commit-type',
      'feat',
      '--commit-scope',
      'workflow',
      '--title',
      '   ',
      '--description',
      'Creates a ready PR.',
      '--problem',
      'Direct PR creation could bypass workflow rules.',
      '--acceptance-criteria',
      '- PR body follows the standard structure.',
      '--key-changes',
      '- Add structured PR creation.',
      '--architecture-impact',
      'Workflow owns PR body construction.',
      '--validation',
      '- pnpm test',
      '--notes',
      'None.',
    ])

    expect(result).toStrictEqual({
      ok: false,
      reason: 'Expected non-empty value for --title.',
    })
  })
})
