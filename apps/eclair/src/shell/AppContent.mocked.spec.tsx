import '@testing-library/jest-dom/vitest'
import {
  render, screen 
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import type { RiviereGraph } from '@living-architecture/riviere-schema'

interface MockGraphState {
  readonly hasGraph: boolean
  readonly graphName: string | undefined
  readonly graph: RiviereGraph | null
  readonly isLoadingDemo: boolean
}

const useGraphMock = vi.fn<() => MockGraphState>()
const graphProviderMock = vi.fn(({ children }: { children: React.ReactNode }) => (
  <div data-testid="graph-provider">{children}</div>
))
const exportProviderMock = vi.fn(({ children }: { children: React.ReactNode }) => (
  <div data-testid="export-provider">{children}</div>
))

vi.mock('@/platform/infra/graph-state/GraphContext', () => ({
  useGraph: () => useGraphMock(),
  GraphProvider: (props: { children: React.ReactNode }) => graphProviderMock(props),
}))

vi.mock('@/platform/infra/export/ExportContext', () => ({ExportProvider: (props: { children: React.ReactNode }) => exportProviderMock(props),}))

vi.mock('@/shell/components/AppShell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}))

vi.mock('@/features/empty-state/entrypoint/EmptyState', () => ({EmptyState: () => <div>Empty State</div>,}))
vi.mock('@/features/overview/entrypoint/OverviewPage', () => ({OverviewPage: () => <div>Overview Page</div>,}))
vi.mock('@/features/full-graph/entrypoint/FullGraphPage', () => ({FullGraphPage: () => <div>Full Graph Page</div>,}))
vi.mock('@/features/domain-map/entrypoint/DomainMapPage', () => ({DomainMapPage: () => <div>Domain Map Page</div>,}))
vi.mock('@/features/architecture-evolution/entrypoint/ArchitectureEvolutionPage', () => ({ArchitectureEvolutionPage: () => <div>Architecture Evolution Page</div>,}))
vi.mock('@/features/flows/entrypoint/FlowsPage', () => ({ FlowsPage: () => <div>Flows Page</div> }))
vi.mock('@/features/domains/entrypoint/DomainDetailPage', () => ({DomainDetailPage: () => <div>Domain Detail Page</div>,}))
vi.mock('@/features/entities/entrypoint/EntitiesPage', () => ({EntitiesPage: () => <div>Entities Page</div>,}))
vi.mock('@/features/events/entrypoint/EventsPage', () => ({EventsPage: () => <div>Events Page</div>,}))
vi.mock('@/features/comparison/entrypoint/ComparisonPage', () => ({ComparisonPage: () => <div>Comparison Page</div>,}))

import {
  App, AppContent 
} from './App'

const mockGraph = {
  version: '1.0',
  metadata: { domains: {} },
  components: [],
  links: [],
} satisfies RiviereGraph

function renderContent(path: string, graphState?: Partial<ReturnType<typeof useGraphMock>>): void {
  useGraphMock.mockReturnValue({
    hasGraph: true,
    graphName: 'mock-graph',
    graph: mockGraph,
    isLoadingDemo: false,
    ...graphState,
  })

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppContent />
    </MemoryRouter>,
  )
}

describe('AppContent mocked routing', () => {
  beforeEach(() => {
    useGraphMock.mockReset()
    graphProviderMock.mockClear()
    exportProviderMock.mockClear()
  })

  it('renders loading demo state before routes', () => {
    renderContent('/', {
      isLoadingDemo: true,
      hasGraph: false,
      graph: null,
      graphName: undefined,
    })

    expect(screen.getByText('Loading demo graph...')).toBeInTheDocument()
    expect(screen.queryByText('Overview Page')).not.toBeInTheDocument()
  })

  it('renders compare route without requiring a graph', () => {
    renderContent('/compare', {
      hasGraph: false,
      graph: null,
      graphName: undefined,
    })

    expect(screen.getByText('Comparison Page')).toBeInTheDocument()
  })

  it('renders graph-backed routes through required graph wrappers', () => {
    renderContent('/entities')
    expect(screen.getByText('Entities Page')).toBeInTheDocument()

    renderContent('/events')
    expect(screen.getByText('Events Page')).toBeInTheDocument()

    renderContent('/domains/test-domain')
    expect(screen.getByText('Domain Detail Page')).toBeInTheDocument()
  })
})

describe('App', () => {
  it('wraps content with graph and export providers', () => {
    useGraphMock.mockReturnValue({
      hasGraph: false,
      graphName: undefined,
      graph: null,
      isLoadingDemo: false,
    })

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('graph-provider')).toBeInTheDocument()
    expect(screen.getByTestId('export-provider')).toBeInTheDocument()
    expect(graphProviderMock).toHaveBeenCalledOnce()
    expect(exportProviderMock).toHaveBeenCalledOnce()
  })
})
