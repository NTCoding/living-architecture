import {
  describe, it, expect 
} from 'vitest'
import { render } from '@testing-library/react'
import { EdgeLine } from './EdgeLine'
import type { DomainPosition } from './DomainContextGraph'

describe('EdgeLine', () => {
  const from: DomainPosition = {
    id: 'orders',
    x: 100,
    y: 100,
    isCurrent: true,
  }
  const to: DomainPosition = {
    id: 'inventory',
    x: 200,
    y: 200,
    isCurrent: false,
  }

  it('renders SVG group element', () => {
    const { container } = render(
      <svg>
        <EdgeLine
          from={from}
          to={to}
          fromRadius={30}
          toRadius={30}
          testId="test-edge"
          direction="outgoing"
        />
      </svg>,
    )

    const group = container.querySelector('[data-testid="test-edge"]')
    expect(group).toBeInTheDocument()
  })

  it('returns empty group when positions are identical', () => {
    const same: DomainPosition = {
      id: 'test',
      x: 100,
      y: 100,
      isCurrent: true,
    }

    const { container } = render(
      <svg>
        <EdgeLine
          from={same}
          to={same}
          fromRadius={30}
          toRadius={30}
          testId="same-edge"
          direction="outgoing"
        />
      </svg>,
    )

    const group = container.querySelector('[data-testid="same-edge"]')
    expect(group).toBeInTheDocument()
    expect(group?.querySelector('line')).not.toBeInTheDocument()
  })

  it('renders line with correct direction attribute', () => {
    const { container } = render(
      <svg>
        <EdgeLine
          from={from}
          to={to}
          fromRadius={30}
          toRadius={30}
          testId="directed-edge"
          direction="incoming"
        />
      </svg>,
    )

    const group = container.querySelector('[data-direction="incoming"]')
    expect(group).toBeInTheDocument()
  })
})
