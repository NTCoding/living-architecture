import {
  Routes, Route
} from 'react-router-dom'
import { AppShell } from '@/shell/components/AppShell/AppShell'
import {
  GraphProvider, useGraph
} from '@/platform/domain/graph-state/GraphContext'
import { ExportProvider } from '@/platform/infra/export/ExportContext'
import { EmptyState } from '@/features/empty-state/entrypoint/EmptyState'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import { OverviewPage } from '@/features/overview/entrypoint/OverviewPage'
import { FullGraphPage } from '@/features/full-graph/entrypoint/FullGraphPage'
import { DomainMapPage } from '@/features/domain-map/entrypoint/DomainMapPage'
import { FlowsPage } from '@/features/flows/entrypoint/FlowsPage'
import { DomainDetailPage } from '@/features/domains/entrypoint/DomainDetailPage'
import { EntitiesPage } from '@/features/entities/entrypoint/EntitiesPage'
import { EventsPage } from '@/features/events/entrypoint/EventsPage'
import { ComparisonPage } from '@/features/comparison/entrypoint/ComparisonPage'
import { GraphError } from '@/platform/domain/errors/errors'
import { ModulesPage } from '@/features/modules/entrypoint/ModulesPage'
import { useTheme } from '@/platform/domain/theme/ThemeContext'

export function useRequiredGraph(): RiviereGraph {
  const { graph } = useGraph()
  if (graph === null) {
    throw new GraphError(
      'useRequiredGraph called without a graph. This component should only render when hasGraph is true.',
    )
  }
  return graph
}

function Overview(): React.ReactElement {
  const { theme } = useTheme()
  return <OverviewPage graph={useRequiredGraph()} theme={theme} />
}

function FullGraph(): React.ReactElement {
  return <FullGraphPage graph={useRequiredGraph()} />
}

function DomainMap(): React.ReactElement {
  return <DomainMapPage graph={useRequiredGraph()} />
}

function Flows(): React.ReactElement {
  const { theme } = useTheme()
  return <FlowsPage graph={useRequiredGraph()} theme={theme} />
}

function DomainDetail(): React.ReactElement {
  const { theme } = useTheme()
  return <DomainDetailPage graph={useRequiredGraph()} theme={theme} />
}

function Entities(): React.ReactElement {
  return <EntitiesPage graph={useRequiredGraph()} />
}

function Events(): React.ReactElement {
  return <EventsPage graph={useRequiredGraph()} />
}

function Modules(): React.ReactElement {
  const { theme } = useTheme()
  return <ModulesPage graph={useRequiredGraph()} theme={theme} />
}

export function AppContent(): React.ReactElement {
  const {
    hasGraph, graphName, graph, isLoadingDemo
  } = useGraph()

  if (isLoadingDemo) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading demo graph...</p>
        </div>
      </div>
    )
  }

  return (
    <AppShell hasGraph={hasGraph} graphName={graphName} graph={graph}>
      <Routes>
        <Route path="/" element={hasGraph ? <Overview /> : <EmptyState />} />
        <Route path="/full-graph" element={hasGraph ? <FullGraph /> : <EmptyState />} />
        <Route path="/domains" element={hasGraph ? <DomainMap /> : <EmptyState />} />
        <Route path="/flows" element={hasGraph ? <Flows /> : <EmptyState />} />
        <Route path="/entities" element={hasGraph ? <Entities /> : <EmptyState />} />
        <Route path="/events" element={hasGraph ? <Events /> : <EmptyState />} />
        <Route path="/modules" element={hasGraph ? <Modules /> : <EmptyState />} />
        <Route path="/domains/:domainId" element={hasGraph ? <DomainDetail /> : <EmptyState />} />
        <Route path="/compare" element={<ComparisonPage />} />
      </Routes>
    </AppShell>
  )
}

export function App(): React.ReactElement {
  return (
    <GraphProvider>
      <ExportProvider>
        <AppContent />
      </ExportProvider>
    </GraphProvider>
  )
}
