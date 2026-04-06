import {
  describe, it, expect 
} from 'vitest'
import {
  ConventionalCommitTitle, validateConventionalCommit 
} from './conventional-commit-title'
import { WorkflowError } from '../workflow-execution/workflow-runner'

describe('ConventionalCommitTitle', () => {
  describe('parse', () => {
    it('parses valid feat commit', () => {
      const title = ConventionalCommitTitle.parse('feat: add new feature')
      expect(title.toString()).toBe('feat: add new feature')
    })

    it('parses valid fix commit with scope', () => {
      const title = ConventionalCommitTitle.parse('fix(api): resolve bug')
      expect(title.toString()).toBe('fix(api): resolve bug')
    })

    it('parses breaking change indicator', () => {
      const title = ConventionalCommitTitle.parse('feat!: breaking change')
      expect(title.toString()).toBe('feat!: breaking change')
    })

    it('parses breaking change with scope', () => {
      const title = ConventionalCommitTitle.parse('feat(api)!: breaking api change')
      expect(title.toString()).toBe('feat(api)!: breaking api change')
    })

    it('parses all valid commit types', () => {
      const types = [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ]
      for (const type of types) {
        expect(() => ConventionalCommitTitle.parse(`${type}: message`)).not.toThrow()
      }
    })

    it('throws WorkflowError for invalid format', () => {
      expect(() => ConventionalCommitTitle.parse('invalid commit message')).toThrow(WorkflowError)
    })

    it('throws WorkflowError for missing colon', () => {
      expect(() => ConventionalCommitTitle.parse('feat add feature')).toThrow(WorkflowError)
    })

    it('throws error message with guidance', () => {
      expect(() => ConventionalCommitTitle.parse('bad')).toThrow(/Expected format/)
    })
  })
})

describe('validateConventionalCommit', () => {
  it('accepts valid conventional commit', () => {
    expect(() => validateConventionalCommit('feat: add feature')).not.toThrow()
  })

  it('throws for invalid conventional commit', () => {
    expect(() => validateConventionalCommit('invalid')).toThrow(WorkflowError)
  })
})
