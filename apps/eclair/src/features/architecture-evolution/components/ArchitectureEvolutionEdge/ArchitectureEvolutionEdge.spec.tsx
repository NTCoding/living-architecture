import '@testing-library/jest-dom/vitest'
import {
  render, screen 
} from '@testing-library/react'
import { Position } from '@xyflow/react'
import {
  describe, expect, it 
} from 'vitest'
import { ArchitectureEvolutionEdge } from './ArchitectureEvolutionEdge'
import type { ArchitectureEvolutionEdgeData } from '../architecture-evolution-scenario'

function renderEdge(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <svg>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6">
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      {ui}
    </svg>,
  )
}

function createEdgeProps(
  overrides: Partial<React.ComponentProps<typeof ArchitectureEvolutionEdge>>,
): React.ComponentProps<typeof ArchitectureEvolutionEdge> {
  return {
    id: 'web-a-read',
    type: 'architecture',
    source: 'website',
    target: 'service-a',
    selected: false,
    animated: false,
    selectable: true,
    deletable: false,
    data: {
      label: 'GET /orders',
      subtitle: 'Website -> Query API',
      description: 'Website reads orders from the query API.',
      sourcePortLabel: 'Website client',
      targetPortLabel: 'Query API',
      pathShape: 'smoothstep',
      pathOptions: {
        offset: 18,
        borderRadius: 14,
        stepPosition: 0.5,
      },
      kind: 'query',
      state: 'active',
      transition: 'added',
      showLabel: true,
    } satisfies ArchitectureEvolutionEdgeData,
    sourceX: 40,
    sourceY: 30,
    targetX: 160,
    targetY: 180,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    markerEnd: 'url(#arrow)',
    style: {
      stroke: 'var(--green)',
      strokeWidth: 4,
      opacity: 1,
    },
    ...overrides,
  }
}

describe('ArchitectureEvolutionEdge', () => {
  it('renders label and glow for changed edges', () => {
    const { container } = renderEdge(<ArchitectureEvolutionEdge {...createEdgeProps({})} />)

    expect(screen.getByTestId('arch-evo-edge-label-web-a-read')).toHaveTextContent('GET /orders')
    expect(container.querySelector('[data-testid="arch-evo-edge-web-a-read"]')).toHaveClass(
      'arch-evo-edge-group--added',
    )
  })

  it('hides labels when showLabel is false', () => {
    renderEdge(
      <ArchitectureEvolutionEdge
        {...createEdgeProps({
          data: {
            label: 'GET /orders',
            subtitle: 'Website -> Query API',
            description: 'Website reads orders from the query API.',
            sourcePortLabel: 'Website client',
            targetPortLabel: 'Query API',
            pathShape: 'smoothstep',
            pathOptions: {
              offset: 18,
              borderRadius: 14,
              stepPosition: 0.5,
            },
            kind: 'query',
            state: 'active',
            transition: 'unchanged',
            showLabel: false,
          },
        })}
      />,
    )

    expect(screen.queryByTestId('arch-evo-edge-label-web-a-read')).not.toBeInTheDocument()
  })

  it('uses straight graphviz path and removed badge styles when provided', () => {
    const { container } = renderEdge(
      <ArchitectureEvolutionEdge
        {...createEdgeProps({
          data: {
            label: 'Publish OrderPlaced',
            subtitle: 'Service -> Event handler',
            description: 'Removed event publication.',
            sourcePortLabel: 'Service',
            targetPortLabel: 'Handler',
            graphvizPath: 'M10,20 L110,20 L110,80',
            pathShape: 'straight',
            pathOptions: {},
            kind: 'event',
            state: 'ghosted',
            transition: 'removed',
            showLabel: true,
          },
        })}
      />,
    )

    const label = screen.getByTestId('arch-evo-edge-label-web-a-read')
    expect(label).toHaveTextContent('Publish OrderPlaced')
    expect(label).toHaveTextContent('removed')
    expect(label).toHaveAttribute('transform', 'translate(0.4999999999999858 -14)')
    expect(container.querySelector('[fill="#fee2e2"]')).toBeInTheDocument()
  })

  it('falls back to midpoint placement when the graphviz path cannot be parsed', () => {
    renderEdge(
      <ArchitectureEvolutionEdge
        {...createEdgeProps({
          data: {
            label: 'POST /orders',
            subtitle: 'Website -> API',
            description: 'Creates an order.',
            sourcePortLabel: 'Web app',
            targetPortLabel: 'Orders API',
            graphvizPath: 'M',
            pathShape: 'smoothstep',
            pathOptions: { offset: 12 },
            kind: 'write',
            state: 'active',
            transition: 'changed',
            showLabel: true,
          },
        })}
      />,
    )

    expect(screen.getByTestId('arch-evo-edge-label-web-a-read')).toHaveAttribute(
      'transform',
      'translate(9.799999999999997 92)',
    )
    expect(screen.getByText('modified')).toBeInTheDocument()
  })
})
