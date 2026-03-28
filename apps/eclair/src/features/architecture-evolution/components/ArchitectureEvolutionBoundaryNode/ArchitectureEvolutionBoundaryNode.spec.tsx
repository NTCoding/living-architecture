import '@testing-library/jest-dom/vitest'
import {
  render, screen 
} from '@testing-library/react'
import {
  describe, expect, it 
} from 'vitest'
import { ArchitectureEvolutionBoundaryNode } from './ArchitectureEvolutionBoundaryNode'

describe('ArchitectureEvolutionBoundaryNode', () => {
  it('renders the boundary label and kind test id', () => {
    const props: React.ComponentProps<typeof ArchitectureEvolutionBoundaryNode> = {
      id: 'slice-a',
      data: {
        label: 'Slice A',
        boundaryKind: 'slice' 
      },
      selected: false,
      dragging: false,
      selectable: false,
      deletable: false,
      draggable: false,
      zIndex: 1,
      isConnectable: false,
      positionAbsoluteX: 0,
      positionAbsoluteY: 0,
      type: 'boundary',
    }

    render(<ArchitectureEvolutionBoundaryNode {...props} />)

    expect(screen.getByTestId('arch-evo-boundary-slice-a')).toHaveAttribute(
      'data-boundary-kind',
      'slice',
    )
    expect(screen.getByText('Slice A')).toBeInTheDocument()
  })
})
