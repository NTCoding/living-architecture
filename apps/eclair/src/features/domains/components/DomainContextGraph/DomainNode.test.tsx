import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { DomainNode } from './DomainNode'
import type { DomainPosition } from './DomainContextGraph'

describe('DomainNode', () => {
  it('renders SVG group with domain name', () => {
    const position: DomainPosition = { id: 'orders', x: 100, y: 100, isCurrent: true }
    const { container } = render(
      <svg>
        <DomainNode position={position} isSelected={false} onClick={() => {}} />
      </svg>
    )

    const text = container.querySelector('text')
    expect(text).toHaveTextContent('orders')
  })

  it('applies selected styling when isSelected is true', () => {
    const position: DomainPosition = { id: 'orders', x: 100, y: 100, isCurrent: false }
    const { container } = render(
      <svg>
        <DomainNode position={position} isSelected={true} onClick={() => {}} />
      </svg>
    )

    const circle = container.querySelector('circle')
    expect(circle).toHaveAttribute('stroke-width', '3')
  })

  it('applies larger radius and white text for current domain', () => {
    const position: DomainPosition = { id: 'orders', x: 100, y: 100, isCurrent: true }
    const { container } = render(
      <svg>
        <DomainNode position={position} isSelected={false} onClick={() => {}} />
      </svg>
    )

    const circle = container.querySelector('circle')
    const text = container.querySelector('text')
    expect(circle).toHaveAttribute('r', '40')
    expect(text).toHaveAttribute('font-size', '10')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    const position: DomainPosition = { id: 'orders', x: 100, y: 100, isCurrent: true }
    const { container } = render(
      <svg>
        <DomainNode position={position} isSelected={false} onClick={onClick} />
      </svg>
    )

    const group = container.querySelector('g')
    group?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalled()
  })
})
