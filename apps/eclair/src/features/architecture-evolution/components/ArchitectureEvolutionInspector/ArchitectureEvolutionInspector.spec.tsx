import '@testing-library/jest-dom/vitest'
import {
  render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Edge } from '@xyflow/react'
import {
  describe, expect, it, vi 
} from 'vitest'
import type { ArchitectureEvolutionEdgeData } from '../architecture-evolution-scenario'
import { ArchitectureEvolutionInspector } from './ArchitectureEvolutionInspector'

const selectedEdge: Edge<ArchitectureEvolutionEdgeData> = {
  id: 'edge-1',
  source: 'service-a',
  target: 'service-b',
  data: {
    kind: 'event',
    transition: 'added',
    label: 'OrderPlaced',
    subtitle: 'Business event',
    sourcePortLabel: 'publish()',
    targetPortLabel: 'consume()',
    description: 'Emits order created notifications',
    pathShape: 'smoothstep',
    pathOptions: {},
    state: 'active',
    showLabel: true,
  },
}

function renderExpandedInspector(onClose = vi.fn()): void {
  render(
    <ArchitectureEvolutionInspector
      selectedEdge={selectedEdge}
      nodeLabelById={
        new Map([
          ['service-a', 'Orders Service'],
          ['service-b', 'Billing Service'],
        ])
      }
      onClose={onClose}
    />,
  )
}

describe('ArchitectureEvolutionInspector', () => {
  it('renders collapsed state when no edge is selected', () => {
    render(
      <ArchitectureEvolutionInspector
        selectedEdge={null}
        nodeLabelById={new Map()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByTestId('arch-evolution-inspector')).toHaveClass('inspector-panel-collapsed')
    expect(screen.queryByText('Connection Details')).not.toBeInTheDocument()
  })

  it('renders header and contract details for a selected edge', () => {
    renderExpandedInspector()

    expect(screen.getByTestId('arch-evolution-inspector')).toHaveClass('inspector-panel-expanded')
    expect(screen.getByText('event')).toHaveClass('arch-evo-inspector-badge--event')
    expect(
      ['Connection Details', 'added', 'OrderPlaced', 'Business event'].map((text) =>
        screen.getByText(text),
      ),
    ).toHaveLength(4)
  })

  it('renders flow and interface details for a selected edge', () => {
    renderExpandedInspector()

    expect(
      ['Orders Service', 'Billing Service', 'publish()', 'consume()'].map((text) =>
        screen.getByText(text),
      ),
    ).toHaveLength(4)
    expect(screen.getByText('Emits order created notifications')).toBeInTheDocument()
  })

  it('closes when the dismiss button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderExpandedInspector(onClose)

    await user.click(screen.getByRole('button', { name: /close inspector/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
