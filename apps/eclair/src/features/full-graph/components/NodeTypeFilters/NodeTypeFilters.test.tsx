import {
 describe, expect, test, vi 
} from 'vitest'
import {
 render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NodeTypeFilters } from './NodeTypeFilters'
import type { NodeType } from '@/types/riviere'

interface NodeTypeInfo {
  type: NodeType
  nodeCount: number
}

describe('NodeTypeFilters', () => {
  const mockNodeTypes: NodeTypeInfo[] = [
    {
 type: 'API',
nodeCount: 5 
},
    {
 type: 'UseCase',
nodeCount: 3 
},
    {
 type: 'DomainOp',
nodeCount: 8 
},
  ]

  test('renders with node type filters heading', () => {
    render(
      <NodeTypeFilters
        nodeTypes={mockNodeTypes}
        visibleTypes={new Set(['API', 'UseCase', 'DomainOp'])}
        onToggleType={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />
    )

    expect(screen.getByText('Node Type Filters')).toBeInTheDocument()
  })

  test('displays all node types with counts', () => {
    render(
      <NodeTypeFilters
        nodeTypes={mockNodeTypes}
        visibleTypes={new Set(['API', 'UseCase', 'DomainOp'])}
        onToggleType={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />
    )

    expect(screen.getByText('API')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('UseCase')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('DomainOp')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  test('shows checkboxes as checked for visible types', () => {
    render(
      <NodeTypeFilters
        nodeTypes={mockNodeTypes}
        visibleTypes={new Set(['API', 'UseCase'])}
        onToggleType={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />
    )

    expect(screen.getByTestId('node-type-checkbox-API')).toBeChecked()
    expect(screen.getByTestId('node-type-checkbox-UseCase')).toBeChecked()
    expect(screen.getByTestId('node-type-checkbox-DomainOp')).not.toBeChecked()
  })

  test('calls onToggleType when checkbox clicked', async () => {
    const user = userEvent.setup()
    const onToggleType = vi.fn()

    render(
      <NodeTypeFilters
        nodeTypes={mockNodeTypes}
        visibleTypes={new Set(['API', 'UseCase', 'DomainOp'])}
        onToggleType={onToggleType}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />
    )

    await user.click(screen.getByTestId('node-type-checkbox-API'))

    expect(onToggleType).toHaveBeenCalledWith('API')
  })

  test('calls onShowAll when Show All clicked', async () => {
    const user = userEvent.setup()
    const onShowAll = vi.fn()

    render(
      <NodeTypeFilters
        nodeTypes={mockNodeTypes}
        visibleTypes={new Set(['API'])}
        onToggleType={vi.fn()}
        onShowAll={onShowAll}
        onHideAll={vi.fn()}
      />
    )

    await user.click(screen.getByTestId('node-type-filters-show-all'))

    expect(onShowAll).toHaveBeenCalled()
  })

  test('calls onHideAll when Hide All clicked', async () => {
    const user = userEvent.setup()
    const onHideAll = vi.fn()

    render(
      <NodeTypeFilters
        nodeTypes={mockNodeTypes}
        visibleTypes={new Set(['API', 'UseCase', 'DomainOp'])}
        onToggleType={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={onHideAll}
      />
    )

    await user.click(screen.getByTestId('node-type-filters-hide-all'))

    expect(onHideAll).toHaveBeenCalled()
  })

  test('disables Show All when all types visible', () => {
    render(
      <NodeTypeFilters
        nodeTypes={mockNodeTypes}
        visibleTypes={new Set(['API', 'UseCase', 'DomainOp'])}
        onToggleType={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />
    )

    expect(screen.getByTestId('node-type-filters-show-all')).toBeDisabled()
  })

  test('disables Hide All when no types visible', () => {
    render(
      <NodeTypeFilters
        nodeTypes={mockNodeTypes}
        visibleTypes={new Set()}
        onToggleType={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />
    )

    expect(screen.getByTestId('node-type-filters-hide-all')).toBeDisabled()
  })

  test('toggles filter list visibility when header clicked', async () => {
    const user = userEvent.setup()

    render(
      <NodeTypeFilters
        nodeTypes={mockNodeTypes}
        visibleTypes={new Set(['API', 'UseCase', 'DomainOp'])}
        onToggleType={vi.fn()}
        onShowAll={vi.fn()}
        onHideAll={vi.fn()}
      />
    )

    expect(screen.getByTestId('node-type-filters-show-all')).toBeVisible()

    await user.click(screen.getByTestId('node-type-filters-toggle'))

    expect(screen.queryByTestId('node-type-filters-show-all')).not.toBeInTheDocument()
  })
})
