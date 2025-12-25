import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntityAccordion } from './EntityAccordion'
import type { DomainEntity } from '../../extractDomainDetails'
import {
  operationNameSchema,
  stateNameSchema,
  invariantSchema,
  parameterTypeSchema,
  returnTypeSchema,
  type OperationName,
  type StateName,
  type Invariant,
  type ParameterType,
  type ReturnType,
} from '@/types/riviere'

const parseOperation = (s: string): OperationName => operationNameSchema.parse(s)
const parseState = (s: string): StateName => stateNameSchema.parse(s)
const parseInvariant = (s: string): Invariant => invariantSchema.parse(s)
const parseParameterType = (s: string): ParameterType => parameterTypeSchema.parse(s)
const parseReturnType = (s: string): ReturnType => returnTypeSchema.parse(s)

function createEntity(overrides: Partial<DomainEntity> = {}): DomainEntity {
  return {
    name: 'Order',
    description: undefined,
    operations: [parseOperation('begin'), parseOperation('confirm'), parseOperation('cancel')],
    operationDetails: [
      {
        id: 'op-1',
        operationName: parseOperation('begin'),
        name: 'Order.begin',
        behavior: { reads: ['inventory'], validates: ['stock'], modifies: ['order'], emits: ['OrderStarted'] },
        stateChanges: [{ from: parseState('Draft'), to: parseState('Pending') }],
        signature: undefined,
        sourceLocation: undefined,
      },
      {
        id: 'op-2',
        operationName: parseOperation('confirm'),
        name: 'Order.confirm',
        behavior: undefined,
        stateChanges: [{ from: parseState('Pending'), to: parseState('Confirmed') }],
        signature: undefined,
        sourceLocation: undefined,
      },
    ],
    allStates: [parseState('Draft'), parseState('Pending'), parseState('Confirmed'), parseState('Cancelled')],
    invariants: [],
    sourceLocation: undefined,
    ...overrides,
  }
}

describe('EntityAccordion', () => {
  describe('collapsed state', () => {
    it('renders entity name', () => {
      render(<EntityAccordion entity={createEntity({ name: 'Payment' })} />)

      expect(screen.getByText('Payment')).toBeInTheDocument()
    })

    it('renders operation count', () => {
      const entity = createEntity({
        operations: [parseOperation('a'), parseOperation('b'), parseOperation('c')],
      })

      render(<EntityAccordion entity={entity} />)

      expect(screen.getByText(/3 operations/)).toBeInTheDocument()
    })

    it('renders state count when states exist', () => {
      const entity = createEntity({
        allStates: [parseState('A'), parseState('B'), parseState('C'), parseState('D')],
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

    it('shows invariants section when entity has invariants', async () => {
      const user = userEvent.setup()
      const entity = createEntity({
        invariants: [
          parseInvariant('Order must have at least one item'),
          parseInvariant('Total amount must be positive'),
        ],
      })

      render(<EntityAccordion entity={entity} />)

      await user.click(screen.getByRole('button', { name: /order/i }))

      expect(screen.getByText('Business Rules')).toBeInTheDocument()
      expect(screen.getByText('Order must have at least one item')).toBeInTheDocument()
      expect(screen.getByText('Total amount must be positive')).toBeInTheDocument()
    })

    it('does not show invariants section when entity has no invariants', async () => {
      const user = userEvent.setup()
      const entity = createEntity({ invariants: [] })

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
        operationDetails: [
          {
            id: 'op-1',
            operationName: parseOperation('begin'),
            name: 'Order.begin',
            behavior: undefined,
            stateChanges: undefined,
            signature: undefined,
            sourceLocation: {
              filePath: 'src/domain/Order.ts',
              lineNumber: 42,
              repository: 'ecommerce-app',
            },
          },
        ],
      })

      render(<EntityAccordion entity={entity} />)

      await user.click(screen.getByRole('button', { name: /order/i }))

      expect(screen.getByTestId('code-link-path')).toHaveTextContent('src/domain/Order.ts:42')
    })

    it('does not render code link for operations without sourceLocation', async () => {
      const user = userEvent.setup()
      const entity = createEntity()

      render(<EntityAccordion entity={entity} />)

      await user.click(screen.getByRole('button', { name: /order/i }))

      expect(screen.queryByTestId('code-link-path')).not.toBeInTheDocument()
    })

    it('renders code link for entity header when sourceLocation exists', () => {
      const entity = createEntity({
        sourceLocation: {
          filePath: 'src/domain/Order.ts',
          lineNumber: 10,
          repository: 'ecommerce-app',
        },
      })

      render(<EntityAccordion entity={entity} />)

      expect(screen.getAllByTestId('code-link-path')[0]).toHaveTextContent('src/domain/Order.ts:10')
    })

    it('does not render entity header code link when sourceLocation is undefined', () => {
      render(<EntityAccordion entity={createEntity()} />)

      expect(screen.queryAllByTestId('code-link-path')).toHaveLength(0)
    })

    it('opens dropdown menu when operation code link is clicked', async () => {
      const user = userEvent.setup()
      const entity = createEntity({
        operationDetails: [
          {
            id: 'op-1',
            operationName: parseOperation('begin'),
            name: 'Order.begin',
            behavior: undefined,
            stateChanges: undefined,
            signature: undefined,
            sourceLocation: {
              filePath: 'src/domain/Order.ts',
              lineNumber: 42,
              repository: 'ecommerce-app',
            },
          },
        ],
      })

      render(<EntityAccordion entity={entity} />)

      await user.click(screen.getByRole('button', { name: /order/i }))
      await user.click(screen.getByTestId('code-link-path'))

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

    it('does not render state transition when operation has no stateChanges', async () => {
      const user = userEvent.setup()
      const entity = createEntity({
        allStates: [],
        operationDetails: [
          {
            id: 'op-no-state',
            operationName: parseOperation('validate'),
            name: 'Order.validate',
            behavior: undefined,
            stateChanges: undefined,
            signature: undefined,
            sourceLocation: undefined,
          },
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

    it('calls onViewOnGraph with entity name when graph button clicked', async () => {
      const user = userEvent.setup()
      const handleViewOnGraph = vi.fn()

      render(<EntityAccordion entity={createEntity({ name: 'Payment' })} onViewOnGraph={handleViewOnGraph} />)

      await user.click(screen.getByTitle('View on Graph'))

      expect(handleViewOnGraph).toHaveBeenCalledWith('Payment')
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
        operationDetails: [
          {
            id: 'op-with-sig',
            operationName: parseOperation('release'),
            name: 'Order.release',
            behavior: undefined,
            stateChanges: undefined,
            signature: {
              parameters: [
                { name: 'orderId', type: parseParameterType('string') },
                { name: 'reason', type: parseParameterType('ReleaseReason') },
              ],
              returnType: parseReturnType('void'),
            },
            sourceLocation: undefined,
          },
        ],
      })

      render(<EntityAccordion entity={entity} defaultExpanded />)

      expect(screen.getByText(/release/)).toBeInTheDocument()
      expect(screen.getByText(/orderId: string, reason: ReleaseReason/)).toBeInTheDocument()
      expect(screen.getByText(/: void/)).toBeInTheDocument()
    })

    it('renders empty parentheses when no parameters', () => {
      const entity = createEntity({
        operationDetails: [
          {
            id: 'op-no-params',
            operationName: parseOperation('cancel'),
            name: 'Order.cancel',
            behavior: undefined,
            stateChanges: undefined,
            signature: {
              parameters: [],
              returnType: parseReturnType('void'),
            },
            sourceLocation: undefined,
          },
        ],
      })

      render(<EntityAccordion entity={entity} defaultExpanded />)

      expect(screen.getByText('cancel')).toBeInTheDocument()
      expect(screen.getByText('()')).toBeInTheDocument()
    })
  })
})
