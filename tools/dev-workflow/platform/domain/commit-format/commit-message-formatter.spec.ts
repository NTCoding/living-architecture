import {
  describe, it, expect 
} from 'vitest'
import { formatCommitMessage } from './commit-message-formatter'

describe('formatCommitMessage', () => {
  it('appends co-author line to title', () => {
    const result = formatCommitMessage('feat: add feature')
    expect(result).toBe('feat: add feature\n\nCo-Authored-By: Claude <noreply@anthropic.com>')
  })

  it('handles title with special characters', () => {
    const result = formatCommitMessage('fix(api): resolve "quotes" issue')
    expect(result).toContain('fix(api): resolve "quotes" issue')
    expect(result).toContain('Co-Authored-By:')
  })
})
