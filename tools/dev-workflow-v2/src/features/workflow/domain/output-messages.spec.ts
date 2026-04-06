import {
  getOperationBody, getTransitionTitle 
} from './output-messages'

describe('getOperationBody', () => {
  it('capitalizes first word and replaces hyphens with spaces', () => {
    expect(getOperationBody('record-issue')).toBe('Record issue')
  })

  it('handles multiple hyphens', () => {
    expect(getOperationBody('record-ci-passed')).toBe('Record ci passed')
  })

  it('handles three-word operations', () => {
    expect(getOperationBody('record-task-check-passed')).toBe('Record task check passed')
  })
})

describe('getTransitionTitle', () => {
  it('returns state name as-is', () => {
    expect(getTransitionTitle('IMPLEMENTING')).toBe('IMPLEMENTING')
  })
})
