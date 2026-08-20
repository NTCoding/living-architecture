import { describe, expect, it } from 'vitest'
import { GitError, InvalidDraftComponentsFileError, MissingSourceFileError } from './extract-errors'

describe('extract errors', () => {
  it('preserves the CLI error names and messages', () => {
    expect(new GitError('Git failed')).toMatchObject({ name: 'GitError', message: 'Git failed' })
    expect(new InvalidDraftComponentsFileError('Invalid draft')).toMatchObject({
      name: 'InvalidEnrichInputError',
      message: 'Invalid draft',
    })
    expect(new MissingSourceFileError('Missing source')).toMatchObject({
      name: 'InvalidExtractInputError',
      message: 'Missing source',
    })
  })
})
