import {
  describe, it, expect 
} from 'vitest'
import { render } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { DomainEdge } from './DomainEdge'

function renderWithProvider(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<ReactFlowProvider><svg>{ui}</svg></ReactFlowProvider>)
}

describe('DomainEdge', () => {
  it('renders edge path without label when no connections', () => {
    const { container } = renderWithProvider(
      <DomainEdge
        id="e1"
        sourceX={0}
        sourceY={0}
        targetX={100}
        targetY={100}
        data={{
          apiCount: 0,
          eventCount: 0 
        }}
      />
    )

    const path = container.querySelector('path.react-flow__edge-path')
    expect(path).toBeInTheDocument()
  })

  it('renders label with both API and Event counts when both exist', () => {
    const { container } = renderWithProvider(
      <DomainEdge
        id="e1"
        sourceX={0}
        sourceY={0}
        targetX={100}
        targetY={100}
        data={{
          apiCount: 3,
          eventCount: 2 
        }}
      />
    )

    const label = container.querySelector('.react-flow__edge-text')
    expect(label).toHaveTextContent('3 API · 2 Event')
  })

  it('renders label with only API count when no events', () => {
    const { container } = renderWithProvider(
      <DomainEdge
        id="e1"
        sourceX={0}
        sourceY={0}
        targetX={100}
        targetY={100}
        data={{
          apiCount: 5,
          eventCount: 0 
        }}
      />
    )

    const label = container.querySelector('.react-flow__edge-text')
    expect(label).toHaveTextContent('5 API')
  })

  it('renders label with only Event count when no APIs', () => {
    const { container } = renderWithProvider(
      <DomainEdge
        id="e1"
        sourceX={0}
        sourceY={0}
        targetX={100}
        targetY={100}
        data={{
          apiCount: 0,
          eventCount: 4 
        }}
      />
    )

    const label = container.querySelector('.react-flow__edge-text')
    expect(label).toHaveTextContent('4 Event')
  })
})
