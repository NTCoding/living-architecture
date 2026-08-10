import {
  describe,
  expect,
  it,
} from 'vitest'
import {
  render, screen
} from '@testing-library/react'
import { RelationshipLegend } from './RelationshipLegend'

describe('RelationshipLegend', () => {
  it('explains semantic labels, delivery style and conditions', () => {
    render(<RelationshipLegend />)

    const legend = screen.getByLabelText('Relationship legend')
    expect(legend.textContent).toContain('Label: semantic relationship')
    expect(legend.textContent).toContain('sync')
    expect(legend.textContent).toContain('async')
    expect(legend.textContent).toContain('when: condition')
  })
})
