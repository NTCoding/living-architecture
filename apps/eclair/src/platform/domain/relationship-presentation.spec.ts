import {
  describe, expect, it 
} from 'vitest'
import {
  relationshipDetail, relationshipLabel 
} from './relationship-presentation'

describe('relationship presentation', () => {
  it('uses semantic relationship type as the primary label', () => {
    expect(relationshipLabel({ relationshipType: 'executes' })).toBe('executes')
  })

  it('shows delivery and condition as secondary details', () => {
    expect(
      relationshipDetail({
        relationshipType: 'reads',
        type: 'sync',
        condition: 'enabled',
      }),
    ).toBe('reads · sync · when enabled')
  })

  it('falls back without inventing semantics', () => {
    expect(relationshipDetail({ type: 'async' })).toBe('relationship · async')
  })
})
