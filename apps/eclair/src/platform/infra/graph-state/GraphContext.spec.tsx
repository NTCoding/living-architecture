import {
  render, screen, waitFor
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  afterEach, beforeEach, describe, expect, it, vi
} from 'vitest'
import {
  GraphProvider,
  useGraph,
  fetchAndValidateDemoGraph,
  buildDemoGraphUrl,
} from './GraphContext'
import type { RiviereGraph } from '@/types/riviere'
import {
  parseNode, parseDomainKey
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import { isBrowserEnv } from '@/test/setup'
import { ContextError } from '@/shell/errors/errors'

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}
const CODE_LINK_SETTINGS_KEY = 'eclair-code-link-settings'

const testGraph: RiviereGraph = {
  version: '1.0',
  metadata: {
    name: 'Test Graph',
    description: 'A test graph for unit tests',
    domains: {
      [parseDomainKey('test-domain')]: {
        description: 'Test domain',
        systemType: 'domain',
      },
    },
  },
  components: [
    parseNode({
      sourceLocation: testSourceLocation,
      id: 'node-1',
      type: 'API',
      name: 'Test API',
      domain: 'test-domain',
      module: 'test-module',
      apiType: 'REST',
      httpMethod: 'GET',
      path: '/test',
    }),
  ],
  links: [],
}

const anotherGraph: RiviereGraph = {
  version: '1.0',
  metadata: {
    name: 'Another Graph',
    domains: {
      [parseDomainKey('test-domain')]: {
        description: 'Test domain',
        systemType: 'domain',
      },
    },
  },
  components: [],
  links: [],
}

function TestConsumer(): React.ReactElement {
  const {
    graph, setGraph, clearGraph, hasGraph, graphName 
  } = useGraph()
  return (
    <div>
      <span data-testid="has-graph">{hasGraph ? 'yes' : 'no'}</span>
      <span data-testid="graph-name">{graphName ?? 'none'}</span>
      <span data-testid="node-count">{graph?.components.length ?? 0}</span>
      <button onClick={() => setGraph(testGraph)}>Load Test Graph</button>
      <button onClick={() => setGraph(anotherGraph)}>Load Another Graph</button>
      <button onClick={() => clearGraph()}>Clear Graph</button>
    </div>
  )
}

describe('GraphContext', () => {
  it('provides null graph initially', () => {
    render(
      <GraphProvider>
        <TestConsumer />
      </GraphProvider>,
    )

    expect(screen.getByTestId('has-graph')).toHaveTextContent('no')
    expect(screen.getByTestId('graph-name')).toHaveTextContent('none')
    expect(screen.getByTestId('node-count')).toHaveTextContent('0')
  })

  it('updates graph when setGraph called', async () => {
    const user = userEvent.setup()

    render(
      <GraphProvider>
        <TestConsumer />
      </GraphProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Load Test Graph' }))

    expect(screen.getByTestId('has-graph')).toHaveTextContent('yes')
    expect(screen.getByTestId('graph-name')).toHaveTextContent('Test Graph')
    expect(screen.getByTestId('node-count')).toHaveTextContent('1')
  })

  it('clears graph when clearGraph called', async () => {
    const user = userEvent.setup()

    render(
      <GraphProvider>
        <TestConsumer />
      </GraphProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Load Test Graph' }))
    expect(screen.getByTestId('has-graph')).toHaveTextContent('yes')

    await user.click(screen.getByRole('button', { name: 'Clear Graph' }))
    expect(screen.getByTestId('has-graph')).toHaveTextContent('no')
    expect(screen.getByTestId('graph-name')).toHaveTextContent('none')
  })

  it('hasGraph reflects current state correctly', async () => {
    const user = userEvent.setup()

    render(
      <GraphProvider>
        <TestConsumer />
      </GraphProvider>,
    )

    expect(screen.getByTestId('has-graph')).toHaveTextContent('no')

    await user.click(screen.getByRole('button', { name: 'Load Test Graph' }))
    expect(screen.getByTestId('has-graph')).toHaveTextContent('yes')

    await user.click(screen.getByRole('button', { name: 'Clear Graph' }))
    expect(screen.getByTestId('has-graph')).toHaveTextContent('no')
  })

  it('graphName returns metadata.name from loaded graph', async () => {
    const user = userEvent.setup()

    render(
      <GraphProvider>
        <TestConsumer />
      </GraphProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Load Another Graph' }))
    expect(screen.getByTestId('graph-name')).toHaveTextContent('Another Graph')
  })

  it('throws ContextError when useGraph called outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow(ContextError)

    consoleError.mockRestore()
  })

  it('throws with descriptive message when useGraph called outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestConsumer />)
    }).toThrow('useGraph must be used within a GraphProvider')

    consoleError.mockRestore()
  })

  describe('demo mode', () => {
    const testState = {originalHref: '',}

    beforeEach(() => {
      localStorage.clear()
      testState.originalHref = window.location.href
      window.history.pushState({}, '', '?demo=true')
      vi.spyOn(window, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(testGraph), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      vi.spyOn(window.history, 'replaceState')
    })

    afterEach(() => {
      vi.restoreAllMocks()
      window.history.pushState({}, '', testState.originalHref)
    })

    it('sets GitHub org in localStorage when demo mode detected', async () => {
      function DemoTestConsumer(): React.ReactElement {
        const { isLoadingDemo } = useGraph()
        return <span data-testid="loading">{isLoadingDemo ? 'loading' : 'done'}</span>
      }

      render(
        <GraphProvider>
          <DemoTestConsumer />
        </GraphProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done')
      })

      const stored = localStorage.getItem(CODE_LINK_SETTINGS_KEY)
      const settings = JSON.parse(stored ?? '{}')
      expect(settings.githubOrg).toBe('https://github.com/NTCoding')
    })

    it('loads graph when demo mode detected', async () => {
      function DemoTestConsumer(): React.ReactElement {
        const {
          hasGraph, graphName, isLoadingDemo
        } = useGraph()
        return (
          <div>
            <span data-testid="loading">{isLoadingDemo ? 'loading' : 'done'}</span>
            <span data-testid="has-graph">{hasGraph ? 'yes' : 'no'}</span>
            <span data-testid="graph-name">{graphName ?? 'none'}</span>
          </div>
        )
      }

      render(
        <GraphProvider>
          <DemoTestConsumer />
        </GraphProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done')
      })

      expect(screen.getByTestId('has-graph')).toHaveTextContent('yes')
      expect(screen.getByTestId('graph-name')).toHaveTextContent('Test Graph')
    })

    it('clears demo param from URL after loading demo graph', async () => {
      function DemoTestConsumer(): React.ReactElement {
        const { isLoadingDemo } = useGraph()
        return <span data-testid="loading">{isLoadingDemo ? 'loading' : 'done'}</span>
      }

      render(
        <GraphProvider>
          <DemoTestConsumer />
        </GraphProvider>,
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('done')
      })

      expect(window.history.replaceState).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.stringMatching(/\/$/),
      )
    })
  })

  describe.skipIf(isBrowserEnv)('buildDemoGraphUrl (jsdom only)', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('builds URL using Vite base path', () => {
      vi.stubEnv('BASE_URL', '/eclair/')
      expect(buildDemoGraphUrl()).toBe('/eclair/ecommerce-complete.json')
    })
  })

  describe('fetchAndValidateDemoGraph', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('returns graph when fetch and validation succeed', async () => {
      vi.spyOn(window, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(testGraph), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const result = await fetchAndValidateDemoGraph('/test.json')

      expect(result.metadata.name).toBe('Test Graph')
    })

    it('throws error when fetch fails', async () => {
      vi.spyOn(window, 'fetch').mockResolvedValue(
        new Response(null, { status: 404 }),
      )

      await expect(fetchAndValidateDemoGraph('/test.json')).rejects.toThrow(
        'Failed to fetch demo graph: 404',
      )
    })

    it('throws error when validation fails', async () => {
      const invalidGraph = {
        version: '1.0',
        metadata: {
          domains: {
            test: {
              description: 'test',
              systemType: 'domain',
            },
          },
        },
        components: [
          {
            id: 'bad-node',
            type: 'InvalidType',
          },
        ],
        links: [],
      }

      vi.spyOn(window, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(invalidGraph), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      await expect(fetchAndValidateDemoGraph('/test.json')).rejects.toThrow(/Invalid RiviereGraph/)
    })
  })
})
