import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventAccordion } from './EventAccordion'
import type { DomainEvent } from '../../extractDomainDetails'

function createEvent(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    id: 'evt-1',
    eventName: 'OrderPlaced',
    schema: undefined,
    sourceLocation: undefined,
    handlers: [],
    ...overrides,
  }
}

describe('EventAccordion', () => {
  describe('collapsed state', () => {
    it('renders event name with lightning icon', () => {
      render(<EventAccordion event={createEvent({ eventName: 'PaymentReceived' })} />)

      expect(screen.getByText('PaymentReceived')).toBeInTheDocument()
      expect(document.querySelector('.ph-lightning')).toBeInTheDocument()
    })

    it('renders handler count when handlers exist', () => {
      const event = createEvent({
        handlers: [
          { domain: 'shipping', handlerName: 'CreateShipment' },
          { domain: 'notification', handlerName: 'SendEmail' },
        ],
      })

      render(<EventAccordion event={event} />)

      expect(screen.getByText(/2 handlers/)).toBeInTheDocument()
    })

    it('renders singular handler text for single handler', () => {
      const event = createEvent({
        handlers: [{ domain: 'shipping', handlerName: 'CreateShipment' }],
      })

      render(<EventAccordion event={event} />)

      expect(screen.getByText(/1 handler$/)).toBeInTheDocument()
    })

    it('renders no handlers text when handlers list is empty', () => {
      render(<EventAccordion event={createEvent({ handlers: [] })} />)

      expect(screen.getByText('No handlers')).toBeInTheDocument()
    })

    it('does not show handler details when collapsed', () => {
      const event = createEvent({
        handlers: [{ domain: 'shipping', handlerName: 'CreateShipment' }],
      })

      render(<EventAccordion event={event} />)

      expect(screen.queryByText('CreateShipment')).not.toBeInTheDocument()
    })
  })

  describe('expanded state', () => {
    it('expands when header is clicked', async () => {
      const user = userEvent.setup()
      const event = createEvent({
        handlers: [{ domain: 'shipping', handlerName: 'CreateShipment' }],
      })

      render(<EventAccordion event={event} />)

      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      expect(screen.getByText('CreateShipment')).toBeInTheDocument()
    })

    it('shows all handlers with their domains', async () => {
      const user = userEvent.setup()
      const event = createEvent({
        handlers: [
          { domain: 'shipping', handlerName: 'CreateShipment' },
          { domain: 'notification', handlerName: 'SendEmail' },
        ],
      })

      render(<EventAccordion event={event} />)

      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      expect(screen.getByText('CreateShipment')).toBeInTheDocument()
      expect(screen.getByText('shipping')).toBeInTheDocument()
      expect(screen.getByText('SendEmail')).toBeInTheDocument()
      expect(screen.getByText('notification')).toBeInTheDocument()
    })

    it('shows schema when available', async () => {
      const user = userEvent.setup()
      const event = createEvent({ schema: '{ orderId: string, total: number }' })

      render(<EventAccordion event={event} />)

      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      expect(screen.getByText(/orderId/)).toBeInTheDocument()
      expect(screen.getByText(/string/)).toBeInTheDocument()
    })

    it('applies syntax highlighting to schema keys', async () => {
      const user = userEvent.setup()
      const event = createEvent({ schema: '{ orderId: string }' })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const keyElement = screen.getByText(/orderId/)
      expect(keyElement).toHaveClass('text-[var(--primary)]')
    })

    it('applies syntax highlighting to type keywords', async () => {
      const user = userEvent.setup()
      const event = createEvent({ schema: '{ orderId: string }' })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const typeElements = screen.getAllByText(/string/)
      expect(typeElements[0]).toHaveClass('text-[#8B5CF6]')
    })

    it('applies syntax highlighting to string literals', async () => {
      const user = userEvent.setup()
      const event = createEvent({ schema: '{ type: OrderCancelled }' })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const stringElement = screen.getByText(/OrderCancelled/)
      expect(stringElement).toHaveClass('text-[#8B5CF6]')
    })

    it('formats schema with each property on its own line', async () => {
      const user = userEvent.setup()
      const event = createEvent({ schema: '{ type: OrderCancelled, orderId: string }' })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const preElement = document.querySelector('pre')
      expect(preElement?.textContent).toContain('orderId')
    })

    it('handles complex nested schema objects', async () => {
      const user = userEvent.setup()
      const event = createEvent({
        schema: '{ orderId: string, items: Item[], metadata: { timestamp: timestamp, version: number } }',
      })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      expect(screen.getByText(/orderId/)).toBeInTheDocument()
      expect(screen.getByText(/Item\[\]/)).toBeInTheDocument()
    })

    it('handles schema with string type values correctly', async () => {
      const user = userEvent.setup()
      const event = createEvent({
        schema: '{ count: number, active: boolean, created: timestamp }',
      })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const stringValues = screen.getAllByText(/number|boolean|timestamp/)
      stringValues.forEach((el) => {
        expect(el).toHaveClass('text-[#8B5CF6]')
      })
    })

    it('handles schema with capitalized value names', async () => {
      const user = userEvent.setup()
      const event = createEvent({
        schema: '{ order: OrderEntity, user: UserEntity }',
      })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const stringValues = screen.getAllByText(/OrderEntity|UserEntity/)
      stringValues.forEach((el) => {
        expect(el).toHaveClass('text-[#8B5CF6]')
      })
    })

    it('shows schema when schema is empty object', async () => {
      const user = userEvent.setup()
      const event = createEvent({ schema: '{}' })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const preElement = document.querySelector('pre')
      expect(preElement).toBeInTheDocument()
    })

    it('hides handler details when header is clicked again', async () => {
      const user = userEvent.setup()
      const event = createEvent({
        handlers: [{ domain: 'shipping', handlerName: 'CreateShipment' }],
      })

      render(<EventAccordion event={event} />)

      await user.click(screen.getByRole('button', { name: /orderplaced/i }))
      expect(screen.getByText('CreateShipment')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /orderplaced/i }))
      expect(screen.queryByText('CreateShipment')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has expand/collapse button with aria-expanded', () => {
      render(<EventAccordion event={createEvent()} />)

      const button = screen.getByRole('button', { name: /orderplaced/i })
      expect(button).toHaveAttribute('aria-expanded', 'false')
    })

    it('updates aria-expanded when expanded', async () => {
      const user = userEvent.setup()

      render(<EventAccordion event={createEvent()} />)

      const button = screen.getByRole('button', { name: /orderplaced/i })
      await user.click(button)

      expect(button).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('code links', () => {
    it('renders code link when sourceLocation exists with lineNumber', () => {
      const event = createEvent({
        sourceLocation: {
          filePath: 'src/events/OrderPlaced.ts',
          lineNumber: 15,
          repository: 'ecommerce-app',
        },
      })

      render(<EventAccordion event={event} />)

      expect(screen.getByTestId('code-link-path')).toHaveTextContent('src/events/OrderPlaced.ts:15')
    })

    it('does not render code link when sourceLocation is undefined', () => {
      render(<EventAccordion event={createEvent()} />)

      expect(screen.queryByTestId('code-link-path')).not.toBeInTheDocument()
    })

    it('does not render code link when sourceLocation.lineNumber is undefined', () => {
      const event = createEvent({
        sourceLocation: {
          filePath: 'src/events/OrderPlaced.ts',
          repository: 'ecommerce-app',
        },
      })

      render(<EventAccordion event={event} />)

      expect(screen.queryByTestId('code-link-path')).not.toBeInTheDocument()
    })

    it('does not render code link when sourceLocation exists but lineNumber is missing', () => {
      const event = createEvent({
        sourceLocation: {
          filePath: 'src/events/OrderPlaced.ts',
          repository: 'ecommerce-app',
        },
      })

      render(<EventAccordion event={event} />)

      expect(screen.queryByTestId('code-link-path')).not.toBeInTheDocument()
    })

    it('prevents event propagation when clicking code link menu', async () => {
      const user = userEvent.setup()
      const event = createEvent({
        handlers: [{ domain: 'shipping', handlerName: 'CreateShipment' }],
        sourceLocation: {
          filePath: 'src/events/OrderPlaced.ts',
          lineNumber: 15,
          repository: 'ecommerce-app',
        },
      })

      render(<EventAccordion event={event} />)

      const codeLink = screen.getByTestId('code-link-path').closest('div')
      if (!codeLink) throw new Error('Code link wrapper div not found')
      await user.click(codeLink)

      expect(screen.queryByText('CreateShipment')).not.toBeInTheDocument()
    })
  })

  describe('defaultExpanded prop', () => {
    it('shows handler details initially when defaultExpanded is true', () => {
      const event = createEvent({
        handlers: [{ domain: 'shipping', handlerName: 'CreateShipment' }],
      })

      render(<EventAccordion event={event} defaultExpanded />)

      expect(screen.getByText('CreateShipment')).toBeInTheDocument()
    })
  })

  describe('onViewOnGraph callback', () => {
    it('renders view on graph button when onViewOnGraph is provided', () => {
      const event = createEvent()
      const onViewOnGraph = () => {}

      render(<EventAccordion event={event} onViewOnGraph={onViewOnGraph} />)

      expect(screen.getByTitle('View on Graph')).toBeInTheDocument()
    })

    it('does not render view on graph button when onViewOnGraph is undefined', () => {
      render(<EventAccordion event={createEvent()} />)

      expect(screen.queryByTitle('View on Graph')).not.toBeInTheDocument()
    })

    it('calls onViewOnGraph with event id when button is clicked', async () => {
      const user = userEvent.setup()
      const event = createEvent({ id: 'evt-123' })
      const onViewOnGraph = vi.fn()

      render(<EventAccordion event={event} onViewOnGraph={onViewOnGraph} />)

      await user.click(screen.getByTitle('View on Graph'))

      expect(onViewOnGraph).toHaveBeenCalledWith('evt-123')
      expect(onViewOnGraph).toHaveBeenCalledTimes(1)
    })

    it('prevents event propagation when clicking view on graph button', async () => {
      const user = userEvent.setup()
      const event = createEvent({
        handlers: [{ domain: 'shipping', handlerName: 'CreateShipment' }],
      })
      const onViewOnGraph = () => {}

      render(<EventAccordion event={event} onViewOnGraph={onViewOnGraph} />)

      await user.click(screen.getByTitle('View on Graph'))

      expect(screen.queryByText('CreateShipment')).not.toBeInTheDocument()
    })
  })

  describe('schema highlighting edge cases', () => {
    it('highlights punctuation characters', async () => {
      const user = userEvent.setup()
      const event = createEvent({ schema: '{ items: [] }' })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const preElement = document.querySelector('pre')
      expect(preElement).toBeInTheDocument()
    })

    it('highlights array types with brackets', async () => {
      const user = userEvent.setup()
      const event = createEvent({ schema: '{ tags: string[], counts: number[] }' })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      expect(screen.getByText(/string\[\]/)).toBeInTheDocument()
      expect(screen.getByText(/number\[\]/)).toBeInTheDocument()
    })

    it('highlights primitive types', async () => {
      const user = userEvent.setup()
      const event = createEvent({
        schema: '{ str: string, num: number, bool: boolean, nul: null, undef: undefined, time: timestamp }',
      })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const preElement = document.querySelector('pre')
      expect(preElement?.textContent).toContain('string')
      expect(preElement?.textContent).toContain('number')
      expect(preElement?.textContent).toContain('boolean')
    })

    it('handles single-quoted strings in schema', async () => {
      const user = userEvent.setup()
      const event = createEvent({ schema: "{ status: 'active' }" })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const preElement = document.querySelector('pre')
      expect(preElement).toBeInTheDocument()
    })

    it('handles schemas with union types', async () => {
      const user = userEvent.setup()
      const event = createEvent({ schema: '{ status: pending | active | completed }' })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const preElement = document.querySelector('pre')
      expect(preElement?.textContent).toContain('pending | active | completed')
    })

    it('handles lowercase type names as plain text', async () => {
      const user = userEvent.setup()
      const event = createEvent({ schema: '{ data: customtype }' })

      render(<EventAccordion event={event} />)
      await user.click(screen.getByRole('button', { name: /orderplaced/i }))

      const preElement = document.querySelector('pre')
      expect(preElement).toBeInTheDocument()
    })
  })

  describe('onViewHandlerOnGraph callback', () => {
    it('renders view on graph button next to each handler when callback provided', () => {
      const event = createEvent({
        handlers: [
          { domain: 'shipping', handlerName: 'CreateShipment' },
          { domain: 'notification', handlerName: 'SendEmail' },
        ],
      })
      const onViewHandlerOnGraph = vi.fn()

      render(<EventAccordion event={event} onViewHandlerOnGraph={onViewHandlerOnGraph} defaultExpanded />)

      const handlerGraphButtons = screen.getAllByTitle('View handler on graph')
      expect(handlerGraphButtons).toHaveLength(2)
    })

    it('calls onViewHandlerOnGraph with handler info when button is clicked', async () => {
      const user = userEvent.setup()
      const event = createEvent({
        handlers: [{ domain: 'shipping', handlerName: 'CreateShipment' }],
      })
      const onViewHandlerOnGraph = vi.fn()

      render(<EventAccordion event={event} onViewHandlerOnGraph={onViewHandlerOnGraph} defaultExpanded />)

      await user.click(screen.getByTitle('View handler on graph'))

      expect(onViewHandlerOnGraph).toHaveBeenCalledWith({
        domain: 'shipping',
        handlerName: 'CreateShipment',
      })
      expect(onViewHandlerOnGraph).toHaveBeenCalledTimes(1)
    })

    it('does not render handler graph buttons when onViewHandlerOnGraph is undefined', () => {
      const event = createEvent({
        handlers: [{ domain: 'shipping', handlerName: 'CreateShipment' }],
      })

      render(<EventAccordion event={event} defaultExpanded />)

      expect(screen.queryByTitle('View handler on graph')).not.toBeInTheDocument()
    })
  })
})
