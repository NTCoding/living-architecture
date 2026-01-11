import {
  Routes, Route
} from 'react-router-dom'
import { AppShell } from '@/components/AppShell/AppShell'
import {
  GraphProvider, useGraph
} from '@/contexts/GraphContext'
import { ExportProvider } from '@/contexts/ExportContext'
import { EmptyState } from '@/features/empty-state/EmptyState'
import type { RiviereGraph } from '@/types/riviere'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { FullGraphPage } from '@/features/full-graph/FullGraphPage'
import { DomainMapPage } from '@/features/domain-map/DomainMapPage'
import { FlowsPage } from '@/features/flows/FlowsPage'
import { DomainDetailPage } from '@/features/domains/DomainDetailPage'
import { EntitiesPage } from '@/features/entities/EntitiesPage'
import { EventsPage } from '@/features/events/EventsPage'
import { ComparisonPage } from '@/features/comparison/ComparisonPage'
import { GraphError } from '@/errors'

function useRequiredGraph(): RiviereGraph {
  const { graph } = useGraph()
  if (graph === null) {
    throw new GraphError(
      'useRequiredGraph called without a graph. This component should only render when hasGraph is true.',
    )
  }
  return graph
}

function Overview(): React.ReactElement {
  return <OverviewPage graph={useRequiredGraph()} />
}

function FullGraph(): React.ReactElement {
  return <FullGraphPage graph={useRequiredGraph()} />
}

function DomainMap(): React.ReactElement {
  return <DomainMapPage graph={useRequiredGraph()} />
}

function Flows(): React.ReactElement {
  return <FlowsPage graph={useRequiredGraph()} />
}

function DomainDetail(): React.ReactElement {
  return <DomainDetailPage graph={useRequiredGraph()} />
}

function Entities(): React.ReactElement {
  return <EntitiesPage graph={useRequiredGraph()} />
}

function Events(): React.ReactElement {
  return <EventsPage graph={useRequiredGraph()} />
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
