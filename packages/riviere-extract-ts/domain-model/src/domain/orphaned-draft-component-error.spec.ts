import { describe, expect, it } from 'vitest'
import { OrphanedDraftComponentError } from './orphaned-draft-component-error'

describe('OrphanedDraftComponentError', () => {
  it('describes unknown module identities by default', () => {
    expect(new OrphanedDraftComponentError(['unknown'], ['orders']).message).toBe(
      'Draft components reference unknown modules: [unknown]. Known modules: [orders]',
    )
  })
})
