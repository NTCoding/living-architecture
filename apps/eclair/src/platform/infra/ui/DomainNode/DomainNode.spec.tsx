import {
  describe, it, expect 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { DomainNode } from './DomainNode'

function renderWithProvider(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<ReactFlowProvider>{ui}</ReactFlowProvider>)
}

describe('DomainNode', () => {
  it('has source and target handles on all four sides for circular layout connections', () => {
    const { container } = renderWithProvider(
      <DomainNode
        data={{
          label: 'orders',
          nodeCount: 5,
        }}
      />,
    )

    const allHandles = container.querySelectorAll('.react-flow__handle')
    expect(allHandles).toHaveLength(8)
  })

  it('renders domain label', () => {
    renderWithProvider(
      <DomainNode
        data={{
          label: 'orders',
          nodeCount: 5,
        }}
      />,
    )

    expect(screen.getByText('orders')).toBeInTheDocument()
  })

  it('shows full label without truncation', () => {
    renderWithProvider(
      <DomainNode
        data={{
          label: 'verylongdomainname',
          nodeCount: 5,
        }}
      />,
    )

    expect(screen.getByText('verylongdomainname')).toBeInTheDocument()
  })

  it('shows full name in tooltip', () => {
    const { container } = renderWithProvider(
      <DomainNode
        data={{
          label: 'verylongdomainname',
          nodeCount: 5,
        }}
      />,
    )

    const nodeDiv = container.querySelector('div.flex[title]')
    expect(nodeDiv).toHaveAttribute('title', 'verylongdomainname')
  })

  it('applies consistent font size for all labels', () => {
    renderWithProvider(
      <DomainNode
        data={{
          label: 'orders',
          nodeCount: 5,
        }}
      />,
    )

    const label = screen.getByText('orders')
    expect(label).toHaveStyle({ fontSize: '14px' })
  })

  it('applies reduced opacity when dimmed', () => {
    const { container } = renderWithProvider(
      <DomainNode
        data={{
          label: 'orders',
          nodeCount: 5,
          dimmed: true,
        }}
      />,
    )

    const nodeDiv = container.querySelector('div.flex')
    expect(nodeDiv).toHaveStyle({ opacity: '0.3' })
  })

  describe('consistent sizing', () => {
    it('uses consistent 120px size for all domain nodes', () => {
      const { container } = renderWithProvider(
        <DomainNode
          data={{
            label: 'orders',
            nodeCount: 5,
          }}
        />,
      )

      const nodeDiv = container.querySelector('div.flex[title]')
      expect(nodeDiv).toHaveStyle({
        width: '120px',
        height: '120px',
      })
    })

    it('ignores calculatedSize prop for consistent sizing', () => {
      const { container } = renderWithProvider(
        <DomainNode
          data={{
            label: 'orders',
            nodeCount: 5,
            calculatedSize: 200,
          }}
        />,
      )

      const nodeDiv = container.querySelector('div.flex[title]')
      expect(nodeDiv).toHaveStyle({
        width: '120px',
        height: '120px',
      })
    })
  })

  describe('external domain styling', () => {
    it('applies external styling class when isExternal is true', () => {
      const { container } = renderWithProvider(
        <DomainNode
          data={{
            label: 'Stripe',
            nodeCount: 3,
            isExternal: true,
          }}
        />,
      )

      const nodeDiv = container.querySelector('div.flex')
      expect(nodeDiv).toHaveClass('domain-node-external')
    })

    it('uses smaller 100px size for external nodes', () => {
      const { container } = renderWithProvider(
        <DomainNode
          data={{
            label: 'Stripe',
            nodeCount: 3,
            isExternal: true,
          }}
        />,
      )

      const nodeDiv = container.querySelector('div.flex[title]')
      expect(nodeDiv).toHaveStyle({
        width: '100px',
        height: '100px',
      })
    })

    it('uses smaller font for external nodes', () => {
      renderWithProvider(
        <DomainNode
          data={{
            label: 'Stripe',
            nodeCount: 3,
            isExternal: true,
          }}
        />,
      )

      const label = screen.getByText('Stripe')
      expect(label).toHaveStyle({ fontSize: '12px' })
    })

    it('renders arrow-square-out icon for external nodes', () => {
      const { container } = renderWithProvider(
        <DomainNode
          data={{
            label: 'Stripe',
            nodeCount: 3,
            isExternal: true,
          }}
        />,
      )

      const icon = container.querySelector('i.ph-arrow-square-out')
      expect(icon).toBeInTheDocument()
    })

    it('does not apply external styling for internal nodes', () => {
      const { container } = renderWithProvider(
        <DomainNode
          data={{
            label: 'orders',
            nodeCount: 5,
            isExternal: false,
          }}
        />,
      )

      const nodeDiv = container.querySelector('div.flex')
      expect(nodeDiv).not.toHaveClass('domain-node-external')
    })

    it('does not render icon for internal nodes', () => {
      const { container } = renderWithProvider(
        <DomainNode
          data={{
            label: 'orders',
            nodeCount: 5,
          }}
        />,
      )

      const icon = container.querySelector('i.ph-arrow-square-out')
      expect(icon).not.toBeInTheDocument()
    })
  })
})
