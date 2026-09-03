import { act, screen } from '@testing-library/react'
import { describe, expect, it, beforeEach } from 'vitest'
import {
  renderFullGraphPage,
  resetCapturedCallbacks,
  triggerBackgroundClick,
} from './FullGraphPage-fixtures'

describe('FullGraphPage', () => {
  beforeEach(resetCapturedCallbacks)

  it('renders page with correct test id', () => {
    renderFullGraphPage()
    expect(screen.getByTestId('full-graph-page')).not.toBeNull()
  })

  it('displays page title', () => {
    renderFullGraphPage()
    expect(screen.getByText('Full Graph')).not.toBeNull()
  })

  it('displays node and edge counts in stats panel', () => {
    renderFullGraphPage()
    expect(screen.getByTestId('stats-panel')).not.toBeNull()
    expect(screen.getByText('3 nodes')).not.toBeNull()
    expect(screen.getByText('2 edges')).not.toBeNull()
  })

  it('renders ForceGraph component', () => {
    renderFullGraphPage()
    expect(screen.getByTestId('force-graph-container')).not.toBeNull()
  })

  it('renders filter toggle button', () => {
    renderFullGraphPage()
    expect(screen.getByTestId('filter-toggle')).not.toBeNull()
  })

  it('highlights node from URL query param', () => {
    renderFullGraphPage(['/full-graph?node=node-1'])
    expect(screen.getByTestId('force-graph-container').getAttribute('data-highlighted-node')).toBe('node-1')
  })

  it('clears highlighted node when background is clicked', () => {
    renderFullGraphPage(['/full-graph?node=node-1'])
    expect(screen.getByTestId('force-graph-container').getAttribute('data-highlighted-node')).toBe('node-1')

    act(triggerBackgroundClick)

    expect(screen.getByTestId('force-graph-container').getAttribute('data-highlighted-node')).not.toBe('node-1')
  })

  it('ignores node param when node ID does not exist in graph', () => {
    renderFullGraphPage(['/full-graph?node=non-existent-node'])
    expect(screen.getByTestId('force-graph-container').getAttribute('data-highlighted-node')).not.toBe('non-existent-node')
  })

  it('validates node exists before highlighting from URL param', () => {
    renderFullGraphPage(['/full-graph?node=node-1'])
    expect(screen.getByTestId('force-graph-container').getAttribute('data-highlighted-node')).toBe('node-1')
  })
})
