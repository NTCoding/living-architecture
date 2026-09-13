import { getOperationBody, getTransitionTitle } from './output-messages'

describe('getOperationBody', () => {
  it('capitalizes first word and replaces hyphens with spaces', () => {
    expect(getOperationBody('record-issue')).toBe('Record issue')
  })

  it('handles multiple hyphens', () => {
    expect(getOperationBody('record-ci-passed')).toBe('Record ci passed')
  })

  it('capitalizes single-hyphen operations like record-review', () => {
    expect(getOperationBody('record-review')).toBe('Record review')
  })

  it('serializes validated read-only operation input', () => {
    expect(getOperationBody('get-review-inputs', { reviewInputs: { pr: 99 } })).toBe('{"pr":99}')
  })
})

describe('getTransitionTitle', () => {
  it('returns state name as-is', () => {
    expect(getTransitionTitle('IMPLEMENTING')).toBe('IMPLEMENTING')
  })
})
