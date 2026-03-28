import '@testing-library/jest-dom/vitest'
import {
  fireEvent, render, screen 
} from '@testing-library/react'
import {
  describe, expect, it, vi 
} from 'vitest'
import {
  CommitHeader,
  FlowControls,
  getRenderedFlowBounds,
} from './ArchitectureEvolutionPageChrome'

describe('ArchitectureEvolutionPageChrome', () => {
  it('renders the compact commit header and toggles details state', () => {
    const onToggleEdgeLabels = vi.fn()
    const onToggleCommitDetails = vi.fn()
    const onPreviousStep = vi.fn()
    const onNextStep = vi.fn()

    render(
      <CommitHeader
        stepIndex={1}
        totalSteps={4}
        commit={{
          title: 'A very long commit title that should truncate in the compact header view',
          shortHash: 'abc1234',
          date: '2026-01-01',
          author: 'Nick Tune',
          description: 'Adds the shipping service',
        }}
        showCommitDetails={false}
        showEdgeLabels={false}
        previousButtonClassName="prev"
        nextButtonClassName="next"
        onToggleEdgeLabels={onToggleEdgeLabels}
        onToggleCommitDetails={onToggleCommitDetails}
        onPreviousStep={onPreviousStep}
        onNextStep={onNextStep}
      />,
    )

    expect(screen.getByText(/2026-01-01/)).toBeInTheDocument()
    expect(screen.getByText(/A very long commit title that should trunca.../)).toBeInTheDocument()
  })

  it('dispatches commit header actions', () => {
    const onToggleEdgeLabels = vi.fn()
    const onToggleCommitDetails = vi.fn()
    const onPreviousStep = vi.fn()
    const onNextStep = vi.fn()

    render(
      <CommitHeader
        stepIndex={1}
        totalSteps={4}
        commit={{
          title: 'A very long commit title that should truncate in the compact header view',
          shortHash: 'abc1234',
          date: '2026-01-01',
          author: 'Nick Tune',
          description: 'Adds the shipping service',
        }}
        showCommitDetails={false}
        showEdgeLabels={false}
        previousButtonClassName="prev"
        nextButtonClassName="next"
        onToggleEdgeLabels={onToggleEdgeLabels}
        onToggleCommitDetails={onToggleCommitDetails}
        onPreviousStep={onPreviousStep}
        onNextStep={onNextStep}
      />,
    )

    fireEvent.click(screen.getByTestId('arch-evolution-label-toggle'))
    fireEvent.click(screen.getByTestId('arch-evolution-details-toggle'))
    fireEvent.click(screen.getByRole('button', { name: /previous commit/i }))
    fireEvent.click(screen.getByRole('button', { name: /next commit/i }))

    expect(onToggleEdgeLabels).toHaveBeenCalledOnce()
    expect(onToggleCommitDetails).toHaveBeenCalledOnce()
    expect(onPreviousStep).toHaveBeenCalledOnce()
    expect(onNextStep).toHaveBeenCalledOnce()
  })

  it('renders flow controls and dispatches the expected actions', () => {
    const onZoomIn = vi.fn()
    const onZoomOut = vi.fn()
    const onToggleFullscreen = vi.fn()

    render(
      <FlowControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onToggleFullscreen={onToggleFullscreen}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /zoom in/i }))
    fireEvent.click(screen.getByRole('button', { name: /zoom out/i }))
    fireEvent.click(screen.getByRole('button', { name: /fullscreen/i }))

    expect(onZoomIn).toHaveBeenCalledOnce()
    expect(onZoomOut).toHaveBeenCalledOnce()
    expect(onToggleFullscreen).toHaveBeenCalledOnce()
  })

  it('returns flow bounds for rendered nodes and labels', () => {
    const container = document.createElement('div')
    const node = document.createElement('div')
    node.className = 'react-flow__node'
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 110,
      bottom: 70,
      width: 100,
      height: 50,
      toJSON: () => ({}),
    })
    container.append(node)
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    label.setAttribute('data-testid', 'arch-evo-edge-label-1')
    vi.spyOn(label, 'getBoundingClientRect').mockReturnValue({
      x: 120,
      y: 80,
      left: 120,
      top: 80,
      right: 170,
      bottom: 100,
      width: 50,
      height: 20,
      toJSON: () => ({}),
    })
    container.append(label)

    const reactFlowInstance: Parameters<typeof getRenderedFlowBounds>[1] = {
      screenToFlowPosition: ({
        x, y 
      }: {
        x: number;
        y: number 
      }) => ({
        x: x / 2,
        y: y / 2,
      }),
    }

    const result = getRenderedFlowBounds(container, reactFlowInstance)

    expect(result).toStrictEqual({
      x: 5,
      y: 10,
      width: 80,
      height: 40,
    })
  })

  it('returns null when no measurable flow elements are rendered', () => {
    const container = document.createElement('div')
    const reactFlowInstance: Parameters<typeof getRenderedFlowBounds>[1] = {
      screenToFlowPosition: ({
        x, y 
      }: {
        x: number;
        y: number 
      }) => ({
        x,
        y 
      }),
    }

    expect(getRenderedFlowBounds(container, reactFlowInstance)).toBeNull()
  })
})
