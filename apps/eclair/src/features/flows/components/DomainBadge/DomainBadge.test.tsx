import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DomainBadge } from './DomainBadge'

describe('DomainBadge', () => {
  it('renders domain name', () => {
    render(<DomainBadge domain="orders" />)

    expect(screen.getByTestId('domain-badge')).toHaveTextContent('orders')
  })

  it('has domain-badge base class', () => {
    render(<DomainBadge domain="orders" />)

    expect(screen.getByTestId('domain-badge')).toHaveClass('domain-badge')
  })

  it('applies consistent color class for same domain', () => {
    const { rerender } = render(<DomainBadge domain="orders" />)
    const firstClass = screen.getByTestId('domain-badge').className

    rerender(<DomainBadge domain="orders" />)
    const secondClass = screen.getByTestId('domain-badge').className

    expect(firstClass).toBe(secondClass)
  })

  it('applies different color classes for different domains', () => {
    const { rerender } = render(<DomainBadge domain="orders" />)
    const ordersClass = screen.getByTestId('domain-badge').className

    rerender(<DomainBadge domain="shipping" />)
    const shippingClass = screen.getByTestId('domain-badge').className

    expect(ordersClass).not.toBe(shippingClass)
  })

  it('handles single character domain name', () => {
    render(<DomainBadge domain="a" />)

    expect(screen.getByTestId('domain-badge')).toHaveTextContent('a')
    expect(screen.getByTestId('domain-badge')).toHaveClass('domain-badge')
  })

  it('handles very long domain name', () => {
    const longDomain = 'orders-fulfillment-international-marketplace'
    render(<DomainBadge domain={longDomain} />)

    expect(screen.getByTestId('domain-badge')).toHaveTextContent(longDomain)
  })

  it('handles domain names with special characters', () => {
    render(<DomainBadge domain="orders-2024" />)

    expect(screen.getByTestId('domain-badge')).toHaveTextContent('orders-2024')
  })

  it('assigns colors from the available color palette', () => {
    const colorClasses = ['domain-badge-purple', 'domain-badge-green', 'domain-badge-amber']
    const testedClasses = new Set<string>()

    for (const domain of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      const { unmount } = render(<DomainBadge domain={domain} />)
      const className = screen.getByTestId('domain-badge').className

      const colorClass = colorClasses.find((color) => className.includes(color))
      if (colorClass) {
        testedClasses.add(colorClass)
      }

      unmount()
    }

    expect(testedClasses.size).toBeGreaterThan(0)
  })

  it('preserves domain text across multiple rerenders', () => {
    const { rerender } = render(<DomainBadge domain="orders" />)

    rerender(<DomainBadge domain="orders" />)
    expect(screen.getByTestId('domain-badge')).toHaveTextContent('orders')

    rerender(<DomainBadge domain="orders" />)
    expect(screen.getByTestId('domain-badge')).toHaveTextContent('orders')
  })

  it('handles domain names with unicode characters', () => {
    render(<DomainBadge domain="order-🚀" />)

    expect(screen.getByTestId('domain-badge')).toHaveTextContent('order-🚀')
  })

  it('handles numeric domain names', () => {
    render(<DomainBadge domain="12345" />)

    expect(screen.getByTestId('domain-badge')).toHaveTextContent('12345')
  })

  it('applies color class alongside base class', () => {
    render(<DomainBadge domain="inventory" />)

    const badge = screen.getByTestId('domain-badge')
    expect(badge.className).toContain('domain-badge')
    const hasColorClass = badge.className
      .split(' ')
      .some((cls) => cls.startsWith('domain-badge-'))
    expect(hasColorClass).toBe(true)
  })
})
