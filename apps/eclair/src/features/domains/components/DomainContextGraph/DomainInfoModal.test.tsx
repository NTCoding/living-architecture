import {
 describe, it, expect, vi 
} from 'vitest'
import {
 render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DomainInfoModal } from './DomainInfoModal'
import type { AggregatedConnection } from '../../extractDomainDetails'

describe('DomainInfoModal', () => {
  const mockConnections: AggregatedConnection[] = [
    {
 targetDomain: 'inventory',
direction: 'outgoing',
apiCount: 1,
eventCount: 0 
},
  ]

  it('renders domain name and label', () => {
    const onClose = vi.fn()
    render(
      <DomainInfoModal
        nodeId="orders"
        connections={mockConnections}
        isCurrent={true}
        currentDomainId="orders"
        onClose={onClose}
      />
    )

    expect(screen.getByText('orders')).toBeInTheDocument()
    expect(screen.getByText('Current domain')).toBeInTheDocument()
  })

  it('shows "Connected domain" label for non-current domains', () => {
    const onClose = vi.fn()
    render(
      <DomainInfoModal
        nodeId="inventory"
        connections={mockConnections}
        isCurrent={false}
        currentDomainId="orders"
        onClose={onClose}
      />
    )

    expect(screen.getByText('Connected domain')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()

    render(
      <DomainInfoModal
        nodeId="orders"
        connections={mockConnections}
        isCurrent={true}
        currentDomainId="orders"
        onClose={onClose}
      />
    )

    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)
    expect(onClose).toHaveBeenCalled()
  })

  it('renders "View Domain Details" link for non-current domains', () => {
    const onClose = vi.fn()
    render(
      <DomainInfoModal
        nodeId="inventory"
        connections={mockConnections}
        isCurrent={false}
        currentDomainId="orders"
        onClose={onClose}
      />
    )

    const link = screen.getByText('View Domain Details')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/domains/inventory')
  })

  it('displays connection information when domain has connections', () => {
    const onClose = vi.fn()
    render(
      <DomainInfoModal
        nodeId="inventory"
        connections={mockConnections}
        isCurrent={false}
        currentDomainId="orders"
        onClose={onClose}
      />
    )

    expect(screen.getByText('Connections')).toBeInTheDocument()
  })
})
