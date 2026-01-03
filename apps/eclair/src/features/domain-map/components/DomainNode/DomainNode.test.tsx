import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { DomainNode } from './DomainNode'

function renderWithProvider(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<ReactFlowProvider>{ui}</ReactFlowProvider>)
}

describe('DomainNode', () => {
  it('has source and target handles on all four sides for circular layout connections', () => {
    const { container } = renderWithProvider(
      <DomainNode data={{ label: 'orders', nodeCount: 5 }} />
    )

    const allHandles = container.querySelectorAll('.react-flow__handle')
    expect(allHandles.length).toBe(8)
  })

  it('renders domain label', () => {
    renderWithProvider(
      <DomainNode data={{ label: 'orders', nodeCount: 5 }} />
    )

    expect(screen.getByText('orders')).toBeInTheDocument()
  })

  it('applies smaller font for long labels', () => {
    renderWithProvider(
      <DomainNode data={{ label: 'verylongdomainname', nodeCount: 5 }} />
    )

    const label = screen.getByText('verylongdomainn…')
    expect(label).toHaveStyle({ fontSize: '10px' })
  })

  it('truncates long labels and shows full name in tooltip', () => {
    const { container } = renderWithProvider(
      <DomainNode data={{ label: 'verylongdomainname', nodeCount: 5 }} />
    )

    expect(screen.getByText('verylongdomainn…')).toBeInTheDocument()
    const nodeDiv = container.querySelector('div.flex[title]')
    expect(nodeDiv).toHaveAttribute('title', 'verylongdomainname')
  })

  it('applies larger font for short labels', () => {
    renderWithProvider(
      <DomainNode data={{ label: 'orders', nodeCount: 5 }} />
    )

    const label = screen.getByText('orders')
    expect(label).toHaveStyle({ fontSize: '12px' })
  })

  it('applies reduced opacity when dimmed', () => {
    const { container } = renderWithProvider(
      <DomainNode data={{ label: 'orders', nodeCount: 5, dimmed: true }} />
    )

    const nodeDiv = container.querySelector('div.flex')
    expect(nodeDiv).toHaveStyle({ opacity: '0.3' })
  })

  describe('external domain styling', () => {
    it('applies external styling class when isExternal is true', () => {
      const { container } = renderWithProvider(
        <DomainNode data={{ label: 'Stripe', nodeCount: 3, isExternal: true }} />
      )

      const nodeDiv = container.querySelector('div.flex')
      expect(nodeDiv).toHaveClass('domain-node-external')
    })

    it('renders arrow-square-out icon for external nodes', () => {
      const { container } = renderWithProvider(
        <DomainNode data={{ label: 'Stripe', nodeCount: 3, isExternal: true }} />
      )

      const icon = container.querySelector('i.ph-arrow-square-out')
      expect(icon).toBeInTheDocument()
    })

    it('does not apply external styling for internal nodes', () => {
      const { container } = renderWithProvider(
        <DomainNode data={{ label: 'orders', nodeCount: 5, isExternal: false }} />
      )

      const nodeDiv = container.querySelector('div.flex')
      expect(nodeDiv).not.toHaveClass('domain-node-external')
    })

    it('does not render icon for internal nodes', () => {
      const { container } = renderWithProvider(
        <DomainNode data={{ label: 'orders', nodeCount: 5 }} />
      )

      const icon = container.querySelector('i.ph-arrow-square-out')
      expect(icon).not.toBeInTheDocument()
    })
  })
})
