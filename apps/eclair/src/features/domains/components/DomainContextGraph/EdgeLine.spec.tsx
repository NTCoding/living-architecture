import {
  describe, it, expect 
} from 'vitest'
import { render } from '@testing-library/react'
import { EdgeLine } from './EdgeLine'
import type { DomainPosition } from './domain-position'

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
          relationshipCount={2}
          isBidirectional={false}
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
          relationshipCount={1}
          isBidirectional={false}
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
          relationshipCount={1}
          isBidirectional={false}
        />
      </svg>,
    )

    const group = container.querySelector('[data-direction="incoming"]')
    expect(group).toBeInTheDocument()
  })

  it('separates the paths and labels for opposite relationship directions', () => {
    const { container } = render(
      <svg>
        <EdgeLine
          from={from}
          to={to}
          fromRadius={40}
          toRadius={30}
          testId="outgoing-edge"
          direction="outgoing"
          relationshipCount={2}
          isBidirectional
        />
        <EdgeLine
          from={to}
          to={from}
          fromRadius={30}
          toRadius={40}
          testId="incoming-edge"
          direction="incoming"
          relationshipCount={1}
          isBidirectional
        />
      </svg>,
    )

    const outgoingLine = container.querySelector('[data-testid="outgoing-edge"] line')
    const incomingLine = container.querySelector('[data-testid="incoming-edge"] line')
    const outgoingLabel = container.querySelector('[data-testid="outgoing-edge"] text')
    const incomingLabel = container.querySelector('[data-testid="incoming-edge"] text')

    expect(outgoingLine?.getAttribute('x1')).not.toBe(incomingLine?.getAttribute('x2'))
    expect(outgoingLabel?.getAttribute('x')).not.toBe(incomingLabel?.getAttribute('x'))
    expect(outgoingLabel?.getAttribute('y')).not.toBe(incomingLabel?.getAttribute('y'))
  })
})
