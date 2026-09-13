import type { CreatePullRequestFailure } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-pull-request-result'
import { describe, expect, it } from 'vitest'
import { formatPullRequestDetailsFailure } from './format-pull-request-details-failure'

describe('formatPullRequestDetailsFailure', () => {
  const cases = [
    {
      failure: {
        ok: false,
        type: 'unsupported-commit-type',
        supportedNames: ['build', 'feat'],
      },
      message: 'Expected --commit-type to be one of: build, feat.',
    },
    {
      failure: { ok: false, type: 'invalid-commit-scope' },
      message: 'Expected --commit-scope to be non-empty, single-line, and at most 20 characters.',
    },
    {
      failure: { ok: false, type: 'empty-pull-request-title' },
      message: 'Expected non-empty value for --title.',
    },
    {
      failure: { ok: false, type: 'pull-request-title-ends-with-full-stop' },
      message: 'Expected --title to not end with a full stop.',
    },
    {
      failure: { ok: false, type: 'pull-request-title-has-uppercase' },
      message: 'Expected --title to use lower case.',
    },
    {
      failure: { ok: false, type: 'pull-request-description-too-short' },
      message: 'Expected --description to be at least 100 characters.',
    },
    {
      failure: { ok: false, type: 'composed-title-too-long' },
      message: 'Expected composed pull request title to be at most 100 characters.',
    },
  ] satisfies ReadonlyArray<{
    readonly failure: CreatePullRequestFailure
    readonly message: string
  }>

  it.each(cases)('formats $failure.type', ({ failure, message }) => {
    expect(formatPullRequestDetailsFailure(failure)).toBe(message)
  })
})
