import {
  describe, expect, it, vi 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DomainFilters } from './DomainFilters'

const mockDomains = [
  {
    name: 'orders',
    nodeCount: 5,
  },
  {
    name: 'inventory',
    nodeCount: 3,
  },
  {
    name: 'shipping',
    nodeCount: 4,
  },
]

describe('DomainFilters', () => {
  it('renders filter panel', () => {
    render(
      <DomainFilters
        domains={mockDomains}
        visibleDomains={new Set(['orders', 'inventory', 'shipping'])}
        onToggleDomain={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />,
    )
    expect(screen.getByTestId('domain-filters')).toBeInTheDocument()
  })

  it('displays all domain names', () => {
    render(
      <DomainFilters
        domains={mockDomains}
        visibleDomains={new Set(['orders', 'inventory', 'shipping'])}
        onToggleDomain={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />,
    )
    expect(screen.getByText('orders')).toBeInTheDocument()
    expect(screen.getByText('inventory')).toBeInTheDocument()
    expect(screen.getByText('shipping')).toBeInTheDocument()
  })

  it('displays node counts', () => {
    render(
      <DomainFilters
        domains={mockDomains}
        visibleDomains={new Set(['orders', 'inventory', 'shipping'])}
        onToggleDomain={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />,
    )
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows checkboxes as checked for visible domains', () => {
    render(
      <DomainFilters
        domains={mockDomains}
        visibleDomains={new Set(['orders', 'shipping'])}
        onToggleDomain={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />,
    )

    expect(screen.getByTestId('domain-checkbox-orders')).toBeChecked()
    expect(screen.getByTestId('domain-checkbox-inventory')).not.toBeChecked()
    expect(screen.getByTestId('domain-checkbox-shipping')).toBeChecked()
  })

  it('calls onToggleDomain when checkbox is clicked', async () => {
    const user = userEvent.setup()
    const onToggleDomain = vi.fn()

    render(
      <DomainFilters
        domains={mockDomains}
        visibleDomains={new Set(['orders', 'inventory', 'shipping'])}
        onToggleDomain={onToggleDomain}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />,
    )

    await user.click(screen.getByTestId('domain-checkbox-orders'))
    expect(onToggleDomain).toHaveBeenCalledWith('orders')
  })

  it('calls onShowAll when Show All button is clicked', async () => {
    const user = userEvent.setup()
    const onShowAll = vi.fn()

    render(
      <DomainFilters
        domains={mockDomains}
        visibleDomains={new Set(['orders'])}
        onToggleDomain={vi.fn()}
        onShowAll={onShowAll}
        onHideAll={vi.fn()}
      />,
    )

    await user.click(screen.getByTestId('domain-filters-show-all'))
    expect(onShowAll).toHaveBeenCalledWith(expect.anything())
  })

  it('calls onHideAll when Hide All button is clicked', async () => {
    const user = userEvent.setup()
    const onHideAll = vi.fn()

    render(
      <DomainFilters
        domains={mockDomains}
        visibleDomains={new Set(['orders', 'inventory', 'shipping'])}
        onToggleDomain={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={onHideAll}
      />,
    )

    await user.click(screen.getByTestId('domain-filters-hide-all'))
    expect(onHideAll).toHaveBeenCalledWith(expect.anything())
  })

  it('can collapse and expand the panel', async () => {
    const user = userEvent.setup()

    render(
      <DomainFilters
        domains={mockDomains}
        visibleDomains={new Set(['orders', 'inventory', 'shipping'])}
        onToggleDomain={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />,
    )

    expect(screen.getByText('orders')).toBeVisible()

    await user.click(screen.getByTestId('domain-filters-toggle'))
    expect(screen.queryByText('orders')).not.toBeInTheDocument()

    await user.click(screen.getByTestId('domain-filters-toggle'))
    expect(screen.getByText('orders')).toBeVisible()
  })

  it('disables Show All when all domains are visible', () => {
    render(
      <DomainFilters
        domains={mockDomains}
        visibleDomains={new Set(['orders', 'inventory', 'shipping'])}
        onToggleDomain={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />,
    )

    expect(screen.getByTestId('domain-filters-show-all')).toBeDisabled()
  })

  it('disables Hide All when no domains are visible', () => {
    render(
      <DomainFilters
        domains={mockDomains}
        visibleDomains={new Set()}
        onToggleDomain={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />,
    )

    expect(screen.getByTestId('domain-filters-hide-all')).toBeDisabled()
  })
})
