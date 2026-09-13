import { ReviewerStatus } from './statuses'

describe('ReviewerStatus', () => {
  it('parses a known status name', () => {
    expect(ReviewerStatus.parse('PENDING').name()).toBe('PENDING')
  })

  it('rejects an unknown status name', () => {
    expect(() => ReviewerStatus.parse('DONE')).toThrow('Unknown reviewer status')
  })
})
