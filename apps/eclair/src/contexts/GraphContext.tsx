import { createContext, useContext, useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import type { RiviereGraph, GraphName } from '@/types/riviere'
import { GraphNameSchema } from '@/types/riviere'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'

interface GraphContextValue {
  graph: RiviereGraph | null
  setGraph: (graph: RiviereGraph | null) => void
  clearGraph: () => void
  hasGraph: boolean
  graphName: GraphName | undefined
  isLoadingDemo: boolean
  isLoadingFromUrl: boolean
  loadGraphFromUrl: (url: string) => Promise<void>
  urlLoadError: string | null
  clearUrlLoadError: () => void
}

const GraphContext = createContext<GraphContextValue | null>(null)

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

function subscribeToNothing(): () => void {
  return () => {}
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
  const [isLoadingFromUrl, setIsLoadingFromUrl] = useState(false)
  const [urlLoadError, setUrlLoadError] = useState<string | null>(null)
  const hasFetchedDemo = useRef(false)

  const setGraph = useCallback((newGraph: RiviereGraph | null) => {
    setGraphState(newGraph)
  }, [])

  const clearGraph = useCallback(() => {
    setGraphState(null)
  }, [])

  const loadGraphFromUrl = useCallback(async (url: string) => {
    setIsLoadingFromUrl(true)
    setUrlLoadError(null)
    try {
      const graph = await fetchAndValidateDemoGraph(url)
      setGraphState(graph)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error loading graph from URL'
      setUrlLoadError(message)
    } finally {
      setIsLoadingFromUrl(false)
    }
  }, [])

  const clearUrlLoadError = useCallback(() => {
    setUrlLoadError(null)
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
    ? GraphNameSchema.parse(graph.metadata.name)
    : undefined

  return (
    <GraphContext.Provider value={{ graph, setGraph, clearGraph, hasGraph, graphName, isLoadingDemo, isLoadingFromUrl, loadGraphFromUrl, urlLoadError, clearUrlLoadError }}>
      {children}
    </GraphContext.Provider>
  )
}

export function useGraph(): GraphContextValue {
  const context = useContext(GraphContext)
  if (context === null) {
    throw new Error('useGraph must be used within a GraphProvider')
  }
  return context
}
