import {
  render, screen, fireEvent, waitFor 
} from '@testing-library/react'
import {
  GraphProvider, useGraph 
} from '@/contexts/GraphContext'
import { EmptyState } from './EmptyState'
import {
  parseNode, parseDomainMetadata 
} from '@/lib/riviereTestFixtures'
import type {
  RiviereGraph, SourceLocation 
} from '@/types/riviere'

const testSourceLocation: SourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

const validGraph: RiviereGraph = {
  version: '1.0',
  metadata: {
    name: 'Test Graph',
    domains: parseDomainMetadata({
      test: {
        description: 'Test',
        systemType: 'domain',
      },
    }),
  },
  components: [
    parseNode({
      sourceLocation: testSourceLocation,
      id: 'n1',
      type: 'UseCase',
      name: 'Test',
      domain: 'test',
      module: 'test',
    }),
  ],
  links: [],
}

function createFile(name: string, content: string): File {
  return new File([content], name, { type: 'application/json' })
}

interface MockDataTransfer {
  files: File[]
  items: Array<{
    kind: string
    type: string
    getAsFile: () => File
  }>
  types: string[]
}

function createDataTransfer(files: File[]): MockDataTransfer {
  return {
    files,
    items: files.map((file) => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    })),
    types: ['Files'],
  }
}

function GraphStateDisplay(): React.ReactElement {
  const {
    hasGraph, graphName 
  } = useGraph()
  return (
    <div>
      <span data-testid="has-graph">{hasGraph ? 'yes' : 'no'}</span>
      <span data-testid="graph-name">{graphName ?? 'none'}</span>
    </div>
  )
}

function renderEmptyState(): void {
  render(
    <GraphProvider>
      <EmptyState />
      <GraphStateDisplay />
    </GraphProvider>,
  )
}

describe('EmptyState', () => {
  it('renders welcome message', () => {
    renderEmptyState()

    expect(screen.getByText(/welcome to éclair/i)).toBeInTheDocument()
    expect(screen.getByText(/upload a rivière architecture graph/i)).toBeInTheDocument()
  })

  it('displays FileUpload component', () => {
    renderEmptyState()

    expect(screen.getByText(/drop your rivière graph here/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument()
  })

  it('displays explanatory content about Rivière graphs', () => {
    renderEmptyState()

    expect(screen.getByText(/what is a rivière graph/i)).toBeInTheDocument()
    expect(
      screen.getByText(/json format for describing flow-based software architecture/i),
    ).toBeInTheDocument()
  })

  it('shows error when file validation fails', async () => {
    class MockFileReader {
      result: string | null = null
      onload: ((event: { target: { result: string } }) => void) | null = null
      readAsText(): void {
        const invalidJson = '{"not": "valid graph"}'
        this.result = invalidJson
        this.onload?.({ target: { result: invalidJson } })
      }
    }
    vi.stubGlobal('FileReader', MockFileReader)

    renderEmptyState()

    const dropZone = screen
      .getByRole('button', { name: /select file/i })
      .closest('div[class*="border-"]')
    if (dropZone === null) {
      throw new Error('Drop zone not found')
    }
    const file = createFile('bad.json', '{"not": "valid graph"}')

    fireEvent.drop(dropZone, { dataTransfer: createDataTransfer([file]) })

    await waitFor(() => {
      expect(screen.getByText(/validation failed/i)).toBeInTheDocument()
    })

    vi.unstubAllGlobals()
  })

  it('sets graph in context when valid file loaded', async () => {
    const validJsonString = JSON.stringify(validGraph)

    class MockFileReader {
      result: string | null = null
      onload: ((event: { target: { result: string } }) => void) | null = null
      readAsText(): void {
        this.result = validJsonString
        this.onload?.({ target: { result: validJsonString } })
      }
    }
    vi.stubGlobal('FileReader', MockFileReader)

    renderEmptyState()

    expect(screen.getByTestId('has-graph')).toHaveTextContent('no')

    const dropZone = screen
      .getByRole('button', { name: /select file/i })
      .closest('div[class*="border-"]')
    if (dropZone === null) {
      throw new Error('Drop zone not found')
    }
    const file = createFile('valid.json', validJsonString)

    fireEvent.drop(dropZone, { dataTransfer: createDataTransfer([file]) })

    await waitFor(() => {
      expect(screen.getByTestId('has-graph')).toHaveTextContent('yes')
    })
    expect(screen.getByTestId('graph-name')).toHaveTextContent('Test Graph')

    vi.unstubAllGlobals()
  })

  it('clears previous error when new valid file loaded', async () => {
    const invalidJson = '{"not": "valid"}'
    const validJsonString = JSON.stringify(validGraph)
    const state = { fileContent: invalidJson }

    class MockFileReader {
      result: string | null = null
      onload: ((event: { target: { result: string } }) => void) | null = null
      readAsText(): void {
        this.result = state.fileContent
        this.onload?.({ target: { result: state.fileContent } })
      }
    }
    vi.stubGlobal('FileReader', MockFileReader)

    renderEmptyState()

    const dropZone = screen
      .getByRole('button', { name: /select file/i })
      .closest('div[class*="border-"]')
    if (dropZone === null) {
      throw new Error('Drop zone not found')
    }

    fireEvent.drop(dropZone, {dataTransfer: createDataTransfer([createFile('bad.json', invalidJson)]),})

    await waitFor(() => {
      expect(screen.getByText(/validation failed/i)).toBeInTheDocument()
    })

    state.fileContent = validJsonString
    fireEvent.drop(dropZone, {dataTransfer: createDataTransfer([createFile('valid.json', validJsonString)]),})

    await waitFor(() => {
      expect(screen.queryByText(/validation failed/i)).not.toBeInTheDocument()
    })

    vi.unstubAllGlobals()
  })

  describe('View Demo', () => {
    it('renders View Demo link', () => {
      renderEmptyState()
      expect(screen.getByRole('link', { name: /view demo/i })).toBeInTheDocument()
    })

    it('View Demo link navigates to demo mode', () => {
      renderEmptyState()
      const link = screen.getByRole('link', { name: /view demo/i })
      expect(link).toHaveAttribute('href', '?demo=true')
    })

    it('displays explanatory text for demo', () => {
      renderEmptyState()
      expect(screen.getByText(/want to see it in action/i)).toBeInTheDocument()
    })
  })
})
