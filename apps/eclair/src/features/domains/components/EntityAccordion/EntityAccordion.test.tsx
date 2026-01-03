import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntityAccordion } from './EntityAccordion'
import { Entity } from '@living-architecture/riviere-query'
import type { DomainOpComponent, SourceLocation } from '@living-architecture/riviere-schema'

const defaultSourceLocation: SourceLocation = { repository: 'test-repo', filePath: 'test.ts' }

function createDomainOp(
  overrides: Partial<DomainOpComponent> & { id: string; operationName: string },
): DomainOpComponent {
  return {
    type: 'DomainOp',
    name: `Order.${overrides.operationName}`,
    domain: 'orders',
    module: 'mod',
    sourceLocation: defaultSourceLocation,
    ...overrides,
  }
}

function createEntity(overrides: {
  name?: string
  domain?: string
  operations?: DomainOpComponent[]
  states?: string[]
  businessRules?: string[]
} = {}): Entity {
  const operations = overrides.operations ?? [
    createDomainOp({
      id: 'op-1',
      operationName: 'begin',
      behavior: { reads: ['inventory'], validates: ['stock'], modifies: ['order'], emits: ['OrderStarted'] },
      stateChanges: [{ from: 'Draft', to: 'Pending' }],
    }),
    createDomainOp({
      id: 'op-2',
      operationName: 'confirm',
      stateChanges: [{ from: 'Pending', to: 'Confirmed' }],
    }),
  ]

  return new Entity(
    overrides.name ?? 'Order',
    overrides.domain ?? 'orders',
    operations,
    overrides.states ?? ['Draft', 'Pending', 'Confirmed', 'Cancelled'],
    [],
    overrides.businessRules ?? [],
  )
}

describe('EntityAccordion', () => {
  describe('collapsed state', () => {
    it('renders entity name', () => {
      render(<EntityAccordion entity={createEntity({ name: 'Payment' })} />)

      expect(screen.getByText('Payment')).toBeInTheDocument()
    })

    it('renders operation count', () => {
      const entity = createEntity({
        operations: [
          createDomainOp({ id: 'op-a', operationName: 'a' }),
          createDomainOp({ id: 'op-b', operationName: 'b' }),
          createDomainOp({ id: 'op-c', operationName: 'c' }),
        ],
      })

      render(<EntityAccordion entity={entity} />)

      expect(screen.getByText(/3 operations/)).toBeInTheDocument()
    })

    it('renders state count when states exist', () => {
      const entity = createEntity({
        states: ['A', 'B', 'C', 'D'],
      })

      render(<EntityAccordion entity={entity} />)

      expect(screen.getByText(/4 states/)).toBeInTheDocument()
    })

    it('does not show operation details when collapsed', () => {
      render(<EntityAccordion entity={createEntity()} />)

      expect(screen.queryByText('begin')).not.toBeInTheDocument()
    })
  })

  describe('expanded state', () => {
    it('expands when header is clicked', async () => {
      const user = userEvent.setup()

      render(<EntityAccordion entity={createEntity()} />)

      await user.click(screen.getByRole('button', { name: /order/i }))

      expect(screen.getByText('begin')).toBeInTheDocument()
    })

    it('shows all operation details when expanded', async () => {
      const user = userEvent.setup()

      render(<EntityAccordion entity={createEntity()} />)

      await user.click(screen.getByRole('button', { name: /order/i }))

      expect(screen.getByText('begin')).toBeInTheDocument()
      expect(screen.getByText('confirm')).toBeInTheDocument()
    })

    it('collapses when header is clicked again', async () => {
      const user = userEvent.setup()

      render(<EntityAccordion entity={createEntity()} />)

      await user.click(screen.getByRole('button', { name: /order/i }))
      expect(screen.getByText('begin')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /order/i }))
      expect(screen.queryByText('begin')).not.toBeInTheDocument()
    })

    it('shows state machine with states', async () => {
      const user = userEvent.setup()

      render(<EntityAccordion entity={createEntity()} />)

      await user.click(screen.getByRole('button', { name: /order/i }))

      expect(screen.getByText('Draft')).toBeInTheDocument()
      expect(screen.getByText('Confirmed')).toBeInTheDocument()
    })

    it('does not show entity-level business rules section (rules are shown at operation level)', async () => {
      const user = userEvent.setup()
      const entity = createEntity({
        businessRules: [
          'Order must have at least one item',
          'Total amount must be positive',
        ],
      })

      render(<EntityAccordion entity={entity} />)

      await user.click(screen.getByRole('button', { name: /order/i }))

      expect(screen.queryByText('Business Rules')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has expand/collapse button with aria-expanded', () => {
      render(<EntityAccordion entity={createEntity()} />)

      const button = screen.getByRole('button', { name: /order/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('updates aria-expanded when expanded', async () => {
      const user = userEvent.setup()

      render(<EntityAccordion entity={createEntity()} />)

      const button = screen.getByRole('button', { name: /order/i })
      await user.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('supports keyboard Enter to toggle', async () => {
      const user = userEvent.setup()

      render(<EntityAccordion entity={createEntity()} />)

      const button = screen.getByRole('button', { name: /order/i })
      button.focus()
      await user.keyboard('{Enter}')

      expect(screen.getByText('begin')).toBeInTheDocument()
    })
  })

  describe('defaultExpanded prop', () => {
    it('renders expanded when defaultExpanded is true', () => {
      render(<EntityAccordion entity={createEntity()} defaultExpanded />)

      expect(screen.getByText('begin')).toBeInTheDocument()
    })
  })

  describe('code links', () => {
    it('renders code link menu for operations with sourceLocation', async () => {
      const user = userEvent.setup()
      const entity = createEntity({
        name: 'Shipment',
        operations: [
          createDomainOp({
            id: 'op-1',
            operationName: 'begin',
            sourceLocation: {
              filePath: 'src/logistics/handler.ts',
              lineNumber: 42,
              repository: 'ecommerce-app',
            },
          }),
        ],
      })

      render(<EntityAccordion entity={entity} />)

      await user.click(screen.getByRole('button', { name: /shipment/i }))

      const codeLinks = screen.getAllByTestId('code-link-path')
      expect(codeLinks[1] ?? codeLinks[0]).toHaveTextContent('src/logistics/handler.ts:42')
    })

    it('does not render code link for operations without lineNumber', async () => {
      const user = userEvent.setup()
      const entity = createEntity()

      render(<EntityAccordion entity={entity} />)

      await user.click(screen.getByRole('button', { name: /order/i }))

      expect(screen.queryByTestId('code-link-path')).not.toBeInTheDocument()
    })

    it('renders code link for entity header when first operation has sourceLocation with lineNumber', () => {
      const entity = createEntity({
        name: 'Invoice',
        operations: [
          createDomainOp({
            id: 'op-1',
            operationName: 'begin',
            sourceLocation: {
              filePath: 'src/billing/domain.ts',
              lineNumber: 10,
              repository: 'ecommerce-app',
            },
          }),
        ],
      })

      render(<EntityAccordion entity={entity} />)

      expect(screen.getAllByTestId('code-link-path')[0]).toHaveTextContent('src/billing/domain.ts:10')
    })

    it('does not render entity header code link when first operation has no lineNumber', () => {
      render(<EntityAccordion entity={createEntity()} />)

      expect(screen.queryAllByTestId('code-link-path')).toHaveLength(0)
    })

    it('opens dropdown menu when operation code link is clicked', async () => {
      const user = userEvent.setup()
      const entity = createEntity({
        name: 'Invoice',
        operations: [
          createDomainOp({
            id: 'op-1',
            operationName: 'begin',
            sourceLocation: {
              filePath: 'src/billing/domain.ts',
              lineNumber: 42,
              repository: 'ecommerce-app',
            },
          }),
        ],
      })

      render(<EntityAccordion entity={entity} />)

      await user.click(screen.getByRole('button', { name: /invoice/i }))
      const codeLinks = screen.getAllByTestId('code-link-path')
      await user.click(codeLinks[1] ?? codeLinks[0])

      expect(screen.getByText('Open in VS Code')).toBeInTheDocument()
      expect(screen.getByText('Open on GitHub')).toBeInTheDocument()
    })
  })

  describe('behavior sections', () => {
    it('renders behavior data when method card is expanded', async () => {
      const user = userEvent.setup()
      const entity = createEntity()

      render(<EntityAccordion entity={entity} defaultExpanded />)

      await user.click(screen.getByRole('button', { name: /begin/i }))

      expect(screen.getByText('Reads')).toBeInTheDocument()
      expect(screen.getByText('inventory')).toBeInTheDocument()
      expect(screen.getByText('Validates')).toBeInTheDocument()
      expect(screen.getByText('stock')).toBeInTheDocument()
      expect(screen.getByText('Modifies')).toBeInTheDocument()
      expect(screen.getByText('order')).toBeInTheDocument()
      expect(screen.getByText('Emits')).toBeInTheDocument()
      expect(screen.getByText('OrderStarted')).toBeInTheDocument()
    })

    it('does not render behavior sections when operation has no behavior', async () => {
      const user = userEvent.setup()
      const entity = createEntity()

      render(<EntityAccordion entity={entity} defaultExpanded />)

      await user.click(screen.getByRole('button', { name: /confirm/i }))

      expect(screen.queryByText('Reads')).not.toBeInTheDocument()
    })

    it('shows empty state message when operation has no behavior and no businessRules', async () => {
      const user = userEvent.setup()
      const entity = createEntity({
        operations: [
          createDomainOp({
            id: 'op-minimal',
            operationName: 'doSomething',
          }),
        ],
      })

      render(<EntityAccordion entity={entity} defaultExpanded />)

      await user.click(screen.getByRole('button', { name: /doSomething/i }))

      const methodContent = screen.getByTestId('method-card-content')
      expect(methodContent).toHaveTextContent('No additional behavior information available')
    })

    it('shows business rules when operation has businessRules but no behavior', async () => {
      const user = userEvent.setup()
      const entity = createEntity({
        operations: [
          createDomainOp({
            id: 'op-rules-only',
            operationName: 'processOrder',
            businessRules: ['Must have valid customer ID'],
          }),
        ],
      })

      render(<EntityAccordion entity={entity} defaultExpanded />)

      await user.click(screen.getByRole('button', { name: /processOrder/i }))

      const methodContent = screen.getByTestId('method-card-content')
      expect(methodContent).toHaveTextContent('Governed by')
      expect(methodContent).toHaveTextContent('Must have valid customer ID')
      expect(methodContent).not.toHaveTextContent('No additional behavior information')
    })

    it('shows "Governed by" section with operation-level businessRules when method expanded', async () => {
      const user = userEvent.setup()
      const entity = createEntity({
        operations: [
          createDomainOp({
            id: 'op-with-rules',
            operationName: 'begin',
            behavior: { reads: ['inventory'], validates: ['stock'], modifies: ['order'], emits: ['OrderStarted'] },
            businessRules: [
              'Order must have at least one item',
              'Total amount must be positive',
            ],
          }),
        ],
      })

      render(<EntityAccordion entity={entity} defaultExpanded />)

      await user.click(screen.getByRole('button', { name: /begin/i }))

      const methodContent = screen.getByTestId('method-card-content')
      expect(methodContent).toHaveTextContent('Governed by')
      expect(methodContent).toHaveTextContent('Order must have at least one item')
      expect(methodContent).toHaveTextContent('Total amount must be positive')
    })

    it('does not show "Governed by" section when operation has no businessRules', async () => {
      const user = userEvent.setup()
      const entity = createEntity({
        operations: [
          createDomainOp({
            id: 'op-no-rules',
            operationName: 'begin',
            behavior: { reads: ['inventory'], validates: ['stock'], modifies: ['order'], emits: ['OrderStarted'] },
          }),
        ],
      })

      render(<EntityAccordion entity={entity} defaultExpanded />)

      await user.click(screen.getByRole('button', { name: /begin/i }))

      const methodContent = screen.getByTestId('method-card-content')
      expect(methodContent).not.toHaveTextContent('Governed by')
    })
  })

  describe('state transitions', () => {
    it('renders state transition badge when operation has stateChanges', async () => {
      const user = userEvent.setup()

      render(<EntityAccordion entity={createEntity()} defaultExpanded />)

      await user.click(screen.getByRole('button', { name: /begin/i }))

      const transitions = screen.getAllByTestId('state-transition')
      const beginTransition = transitions.find(el => el.textContent === 'Draft → Pending')
      expect(beginTransition).toBeInTheDocument()
    })

    it('displays multiple state transitions with visual separators not raw commas', () => {
      const entity = createEntity({
        operations: [
          createDomainOp({
            id: 'op-multi-state',
            operationName: 'processAndShip',
            stateChanges: [
              { from: 'Draft', to: 'Active' },
              { from: 'Active', to: 'Shipped' },
            ],
          }),
        ],
      })

      render(<EntityAccordion entity={entity} defaultExpanded />)

      const transition = screen.getByTestId('state-transition')
      expect(transition.textContent).not.toContain(', ')
      expect(transition.textContent).toContain(' | ')
    })

    it('does not render state transition when operation has no stateChanges', async () => {
      const user = userEvent.setup()
      const entity = createEntity({
        states: [],
        operations: [
          createDomainOp({
            id: 'op-no-state',
            operationName: 'validate',
          }),
        ],
      })

      render(<EntityAccordion entity={entity} defaultExpanded />)

      await user.click(screen.getByRole('button', { name: /validate/i }))

      expect(screen.queryByTestId('state-transition')).not.toBeInTheDocument()
    })
  })

  describe('view on graph button', () => {
    it('does not render graph button when onViewOnGraph not provided', () => {
      render(<EntityAccordion entity={createEntity({ name: 'Payment' })} />)

      expect(screen.queryByTitle('View on Graph')).not.toBeInTheDocument()
    })

    it('renders graph button when onViewOnGraph provided', () => {
      const handleViewOnGraph = vi.fn()

      render(<EntityAccordion entity={createEntity({ name: 'Payment' })} onViewOnGraph={handleViewOnGraph} />)

      expect(screen.getByTitle('View on Graph')).toBeInTheDocument()
    })

    it('calls onViewOnGraph with first operation node ID when graph button clicked', async () => {
      const user = userEvent.setup()
      const handleViewOnGraph = vi.fn()

      render(<EntityAccordion entity={createEntity({ name: 'Payment' })} onViewOnGraph={handleViewOnGraph} />)

      await user.click(screen.getByTitle('View on Graph'))

      expect(handleViewOnGraph).toHaveBeenCalledWith('op-1')
    })

    it('does not expand accordion when graph button clicked', async () => {
      const user = userEvent.setup()
      const handleViewOnGraph = vi.fn()

      render(<EntityAccordion entity={createEntity()} onViewOnGraph={handleViewOnGraph} />)

      await user.click(screen.getByTitle('View on Graph'))

      expect(screen.queryByText('begin')).not.toBeInTheDocument()
    })
  })

  describe('dropdown visibility', () => {
    it('does not clip dropdown menus with overflow-hidden', () => {
      const { container } = render(<EntityAccordion entity={createEntity()} />)

      const outerDiv = container.firstElementChild
      expect(outerDiv).not.toHaveClass('overflow-hidden')
    })
  })

  describe('method signature', () => {
    it('renders parameters with name and type', () => {
      const entity = createEntity({
        operations: [
          createDomainOp({
            id: 'op-with-sig',
            operationName: 'release',
            signature: {
              parameters: [
                { name: 'orderId', type: 'string' },
                { name: 'reason', type: 'ReleaseReason' },
              ],
              returnType: 'void',
            },
          }),
        ],
      })

      render(<EntityAccordion entity={entity} defaultExpanded />)

      expect(screen.getByText(/release/)).toBeInTheDocument()
      expect(screen.getByText(/orderId: string, reason: ReleaseReason/)).toBeInTheDocument()
      expect(screen.getByText(/: void/)).toBeInTheDocument()
    })

    it('renders empty parentheses when no parameters', () => {
      const entity = createEntity({
        operations: [
          createDomainOp({
            id: 'op-no-params',
            operationName: 'cancel',
            signature: {
              parameters: [],
              returnType: 'void',
            },
          }),
        ],
      })

      render(<EntityAccordion entity={entity} defaultExpanded />)

      expect(screen.getByText('cancel')).toBeInTheDocument()
      expect(screen.getByText('()')).toBeInTheDocument()
    })
  })
})
