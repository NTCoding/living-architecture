import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  useMemo,
} from 'react'
import type {
  RiviereGraph, GraphName 
} from '@/types/riviere'
import { graphNameSchema } from '@/types/riviere'
import { parseRiviereGraph } from '@living-architecture/riviere-schema'

interface GraphContextValue {
  readonly graph: RiviereGraph | null
  readonly setGraph: (graph: RiviereGraph | null) => void
  readonly clearGraph: () => void
  readonly hasGraph: boolean
  readonly graphName: GraphName | undefined
  readonly isLoadingDemo: boolean
}

const graphContext = createContext<GraphContextValue | null>(null)

const DEMO_GRAPH_FILENAME = 'ecommerce-complete.json'
const DEFAULT_GITHUB_ORG = 'https://github.com/NTCoding'

export function buildDemoGraphUrl(): string {
  return `${import.meta.env.BASE_URL}${DEMO_GRAPH_FILENAME}`
}

export async function fetchAndValidateDemoGraph(
  url: string = buildDemoGraphUrl(),
): Promise<RiviereGraph> {
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

interface GraphProviderProps {readonly children: React.ReactNode}

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

    localStorage.setItem(
      'eclair-code-link-settings',
      JSON.stringify({
        vscodePath: null,
        githubOrg: DEFAULT_GITHUB_ORG,
        githubBranch: 'main',
      }),
    )

    fetchAndValidateDemoGraph()
      .then((graph) => {
        setGraphState(graph)
        const url = new URL(window.location.href)
        url.searchParams.delete('demo')
        window.history.replaceState({}, '', url.toString())
      })
      .finally(() => {
        setIsLoadingDemo(false)
      })
  }, [isDemoMode])

  const hasGraph = graph !== null
  const graphName =
    graph?.metadata.name === undefined ? undefined : graphNameSchema.parse(graph.metadata.name)

  const contextValue = useMemo(
    () => ({
      graph,
      setGraph,
      clearGraph,
      hasGraph,
      graphName,
      isLoadingDemo,
    }),
    [graph, setGraph, clearGraph, hasGraph, graphName, isLoadingDemo],
  )

  return <graphContext.Provider value={contextValue}>{children}</graphContext.Provider>
}

export function useGraph(): GraphContextValue {
  const context = useContext(graphContext)
  if (context === null) {
    throw new Error('useGraph must be used within a GraphProvider')
  }
  return context
}
