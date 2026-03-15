import '@testing-library/jest-dom/vitest'
import {
  describe, it, expect 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { ArchitectureEvolutionNode } from './ArchitectureEvolutionNode'

function createNodeProps(
  overrides: Partial<React.ComponentProps<typeof ArchitectureEvolutionNode>>,
): React.ComponentProps<typeof ArchitectureEvolutionNode> {
  return {
    id: 'node-1',
    type: 'architecture',
    data: {
      label: 'Orders Service A',
      subtitle: 'Primary service',
      icon: 'stack-simple',
      kind: 'service',
      state: 'active',
      transition: 'unchanged',
      capabilities: [],
    },
    width: 0,
    height: 0,
    dragging: false,
    draggable: false,
    selectable: false,
    deletable: false,
    selected: false,
    zIndex: 0,
    isConnectable: false,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    ...overrides,
  }
}

function renderWithProvider(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<ReactFlowProvider>{ui}</ReactFlowProvider>)
}

describe('ArchitectureEvolutionNode', () => {
  it('renders label, subtitle, and capabilities', () => {
    renderWithProvider(
      <ArchitectureEvolutionNode
        {...createNodeProps({
          id: 'service-a',
          data: {
            label: 'Orders Service A',
            subtitle: 'Primary service',
            icon: 'stack-simple',
            kind: 'service',
            state: 'active',
            transition: 'unchanged',
            capabilities: [
              {
                id: 'service-a:query',
                label: 'Query API',
                state: 'active',
                transition: 'unchanged',
              },
              {
                id: 'service-a:place-order',
                label: 'Place order API',
                state: 'active',
                transition: 'unchanged',
              },
            ],
          },
        })}
      />,
    )

    expect(screen.getByText('Orders Service A')).toBeInTheDocument()
    expect(screen.getByText('Primary service')).toBeInTheDocument()
    expect(screen.getByText('Query API')).toBeInTheDocument()
    expect(screen.getByText('Place order API')).toBeInTheDocument()
  })

  it('exposes node and capability evolution states for styling and tests', () => {
    renderWithProvider(
      <ArchitectureEvolutionNode
        {...createNodeProps({
          id: 'service-b',
          data: {
            label: 'Orders Service B',
            subtitle: 'Legacy service',
            icon: 'stack-simple',
            kind: 'service',
            state: 'ghosted',
            transition: 'removed',
            capabilities: [
              {
                id: 'service-b:place-order',
                label: 'Place order API',
                state: 'ghosted',
                transition: 'removed',
              },
            ],
          },
        })}
      />,
    )

    expect(screen.getByTestId('arch-evo-node-service-b')).toHaveAttribute(
      'data-evolution-state',
      'ghosted',
    )
    expect(screen.getByTestId('arch-evo-capability-service-b:place-order')).toHaveAttribute(
      'data-evolution-state',
      'ghosted',
    )
  })
})
