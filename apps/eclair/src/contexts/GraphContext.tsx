import { createContext, useContext, useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { RiviereGraph, GraphName } from '@/types/riviere'
import { graphNameSchema } from '@/types/riviere'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'

interface GraphContextValue {
  graph: RiviereGraph | null
  setGraph: (graph: RiviereGraph | null) => void
  clearGraph: () => void
  hasGraph: boolean
  graphName: GraphName | undefined
  isLoadingDemo: boolean
}

const graphContext = createContext<GraphContextValue | null>(null)

const DEFAULT_GRAPH_URL = '/ecommerce-complete.json'
const DEFAULT_GITHUB_ORG = 'https://github.com/NTCoding'

export async function fetchAndValidateDemoGraph(url: string = DEFAULT_GRAPH_URL): Promise<RiviereGraph> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch demo graph: ${response.status}`)
  }
  const content = await response.text()
  const data: unknown = JSON.parse(content)
  return parseRiviereGraph(data)
}

function getIsDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('demo') === 'true'
}

function noopUnsubscribe(): void {
  return
}

function subscribeToNothing(): () => void {
  return noopUnsubscribe
}

function useIsDemoMode(): boolean {
  return useSyncExternalStore(subscribeToNothing, getIsDemoMode, () => false)
}

interface GraphProviderProps {
  children: React.ReactNode
}

export function GraphProvider({ children }: GraphProviderProps): React.ReactElement {
  const isDemoMode = useIsDemoMode()
  const [graph, setGraphState] = useState<RiviereGraph | null>(null)
  const [isLoadingDemo, setIsLoadingDemo] = useState(isDemoMode)
  const hasFetchedDemo = useRef(false)

  const setGraph = useCallback((newGraph: RiviereGraph | null) => {
    setGraphState(newGraph)
  }, [])

  const clearGraph = useCallback(() => {
    setGraphState(null)
  }, [])

  useEffect(() => {
    if (!isDemoMode || hasFetchedDemo.current) {
      return
    }

    hasFetchedDemo.current = true

    localStorage.setItem('eclair-code-link-settings', JSON.stringify({
      vscodePath: null,
      githubOrg: DEFAULT_GITHUB_ORG,
      githubBranch: 'main',
    }))

    fetchAndValidateDemoGraph()
      .then((graph) => {
        setGraphState(graph)
      })
      .finally(() => {
        setIsLoadingDemo(false)
      })
  }, [isDemoMode])

  const hasGraph = graph !== null
  const graphName = graph?.metadata.name !== undefined
    ? graphNameSchema.parse(graph.metadata.name)
    : undefined

  return (
    <graphContext.Provider value={{ graph, setGraph, clearGraph, hasGraph, graphName, isLoadingDemo }}>
      {children}
    </graphContext.Provider>
  )
}

export function useGraph(): GraphContextValue {
  const context = useContext(graphContext)
  if (context === null) {
    throw new Error('useGraph must be used within a GraphProvider')
  }
  return context
}
