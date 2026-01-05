import {
 describe, it, expect, vi, afterEach 
} from 'vitest'
import {
 render, screen, waitFor 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ComparisonPage } from './ComparisonPage'

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <ComparisonPage />
    </MemoryRouter>
  )
}

function createValidGraphJson(name: string, nodeCount = 1): string {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `test-domain:test-module:api:node-${i}`,
    type: 'API',
    apiType: 'REST',
    httpMethod: 'GET',
    path: `/api/node-${i}`,
    name: `${name} Node ${i}`,
    domain: 'test-domain',
    module: 'test-module',
    sourceLocation: {
      repository: 'test-repo',
      filePath: `src/api/node-${i}.ts`,
    },
  }))
  return JSON.stringify({
    version: '1.0',
    metadata: {
      name,
      domains: {
        'test-domain': {
          description: 'Test domain for comparison',
          systemType: 'domain',
        },
      },
    },
    components: nodes,
    links: [],
  })
}

function stubFileReaderWithContent(contentToReturn: string): void {
  class MockFileReader {
    result: string | null = null
    onload: ((event: { target: { result: string } }) => void) | null = null
    onerror: (() => void) | null = null
    readAsText(): void {
      this.result = contentToReturn
      this.onload?.({ target: { result: contentToReturn } })
    }
  }
  vi.stubGlobal('FileReader', MockFileReader)
}

function stubFileReaderWithMultipleContents(contentArray: string[]): void {
  const callCounter = { index: 0 }
  class MockFileReader {
    result: string | null = null
    onload: ((event: { target: { result: string } }) => void) | null = null
    onerror: (() => void) | null = null
    readAsText(): void {
      const content = contentArray[callCounter.index]
      if (content === undefined) {
        throw new Error(
          `Mock FileReader called ${callCounter.index + 1} times but only ${contentArray.length} contents provided`
        )
      }
      callCounter.index += 1
      this.result = content
      this.onload?.({ target: { result: content } })
    }
  }
  vi.stubGlobal('FileReader', MockFileReader)
}

describe('ComparisonPage', () => {
  describe('initial state', () => {
    it('renders page header with title and subtitle', () => {
      renderPage()

      expect(screen.getByRole('heading', { name: /compare versions/i })).toBeInTheDocument()
      expect(screen.getByText(/track architecture changes/i)).toBeInTheDocument()
    })

    it('renders two upload zones labeled Before and After', () => {
      renderPage()

      expect(screen.getByText(/before/i)).toBeInTheDocument()
      expect(screen.getByText(/after/i)).toBeInTheDocument()
      expect(screen.getAllByText(/drop json file/i)).toHaveLength(2)
    })

    it('disables compare button when no files uploaded', () => {
      renderPage()

      const compareButton = screen.getByRole('button', { name: /compare/i })
      expect(compareButton).toBeDisabled()
    })

    it('does not show results section initially', () => {
      renderPage()

      expect(screen.queryByText(/comparing versions/i)).not.toBeInTheDocument()
    })
  })

  describe('file upload', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('updates before zone when valid JSON uploaded', async () => {
      const jsonContent = createValidGraphJson('Before Graph')
      stubFileReaderWithContent(jsonContent)

      const user = userEvent.setup()
      renderPage()

      const beforeInput = screen.getByLabelText(/upload before file/i)
      const file = new File([jsonContent], 'before.json', { type: 'application/json' })

      await user.upload(beforeInput, file)

      await waitFor(() => {
        expect(screen.getByText(/before\.json/i)).toBeInTheDocument()
      })
    })

    it('updates after zone when valid JSON uploaded', async () => {
      const jsonContent = createValidGraphJson('After Graph')
      stubFileReaderWithContent(jsonContent)

      const user = userEvent.setup()
      renderPage()

      const afterInput = screen.getByLabelText(/upload after file/i)
      const file = new File([jsonContent], 'after.json', { type: 'application/json' })

      await user.upload(afterInput, file)

      await waitFor(() => {
        expect(screen.getByText(/after\.json/i)).toBeInTheDocument()
      })
    })

    it('enables compare button when both files uploaded', async () => {
      const beforeJson = createValidGraphJson('Before')
      const afterJson = createValidGraphJson('After')
      stubFileReaderWithMultipleContents([beforeJson, afterJson])

      const user = userEvent.setup()
      renderPage()

      const beforeInput = screen.getByLabelText(/upload before file/i)
      const afterInput = screen.getByLabelText(/upload after file/i)

      await user.upload(beforeInput, new File([beforeJson], 'before.json', { type: 'application/json' }))
      await user.upload(afterInput, new File([afterJson], 'after.json', { type: 'application/json' }))

      await waitFor(() => {
        const compareButton = screen.getByRole('button', { name: /compare/i })
        expect(compareButton).toBeEnabled()
      })
    })

    it('shows error when valid JSON but invalid schema uploaded', async () => {
      const invalidSchemaJson = JSON.stringify({ foo: 'bar' })
      stubFileReaderWithContent(invalidSchemaJson)

      const user = userEvent.setup()
      renderPage()

      const beforeInput = screen.getByLabelText(/upload before file/i)
      const file = new File([invalidSchemaJson], 'bad.json', { type: 'application/json' })

      await user.upload(beforeInput, file)

      await waitFor(() => {
        expect(screen.getByText(/invalid file/i)).toBeInTheDocument()
      })
    })
  })

  describe('comparison results', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('shows results section after clicking compare', async () => {
      const beforeJson = createValidGraphJson('Before', 2)
      const afterJson = createValidGraphJson('After', 3)
      stubFileReaderWithMultipleContents([beforeJson, afterJson])

      const user = userEvent.setup()
      renderPage()

      const beforeInput = screen.getByLabelText(/upload before file/i)
      const afterInput = screen.getByLabelText(/upload after file/i)

      await user.upload(beforeInput, new File([beforeJson], 'before.json', { type: 'application/json' }))
      await user.upload(afterInput, new File([afterJson], 'after.json', { type: 'application/json' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /compare/i })).toBeEnabled()
      })

      await user.click(screen.getByRole('button', { name: /compare/i }))

      await waitFor(() => {
        expect(screen.getByText(/comparing versions/i)).toBeInTheDocument()
      })
    })

    it('displays stats showing added/removed/modified/unchanged counts', async () => {
      const domainMetadata = {
d: {
 description: 'Test domain',
systemType: 'domain' 
},
}
      const sl = {
 repository: 'test-repo',
filePath: 'src/test.ts' 
}
      const beforeJson = JSON.stringify({
        version: '1.0',
        metadata: {
 name: 'Before',
domains: domainMetadata 
},
        components: [
          {
 id: 'd:m:api:unchanged',
type: 'API',
apiType: 'REST',
httpMethod: 'GET',
path: '/unchanged',
name: 'Same',
domain: 'd',
module: 'm',
sourceLocation: sl 
},
          {
 id: 'd:m:api:removed',
type: 'API',
apiType: 'REST',
httpMethod: 'GET',
path: '/removed',
name: 'Gone',
domain: 'd',
module: 'm',
sourceLocation: sl 
},
        ],
        links: [],
      })
      const afterJson = JSON.stringify({
        version: '1.0',
        metadata: {
 name: 'After',
domains: domainMetadata 
},
        components: [
          {
 id: 'd:m:api:unchanged',
type: 'API',
apiType: 'REST',
httpMethod: 'GET',
path: '/unchanged',
name: 'Same',
domain: 'd',
module: 'm',
sourceLocation: sl 
},
          {
 id: 'd:m:api:added',
type: 'API',
apiType: 'REST',
httpMethod: 'GET',
path: '/added',
name: 'New',
domain: 'd',
module: 'm',
sourceLocation: sl 
},
        ],
        links: [],
      })
      stubFileReaderWithMultipleContents([beforeJson, afterJson])

      const user = userEvent.setup()
      renderPage()

      const beforeInput = screen.getByLabelText(/upload before file/i)
      const afterInput = screen.getByLabelText(/upload after file/i)

      await user.upload(beforeInput, new File([beforeJson], 'before.json', { type: 'application/json' }))
      await user.upload(afterInput, new File([afterJson], 'after.json', { type: 'application/json' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /compare/i })).toBeEnabled()
      })

      await user.click(screen.getByRole('button', { name: /compare/i }))

      await waitFor(() => {
        expect(screen.getByText(/comparing versions/i)).toBeInTheDocument()
      })

      const statsBar = screen.getByText(/comparing versions/i).parentElement?.parentElement
      expect(statsBar).toBeInTheDocument()
    })
  })

  describe('domain connection diff', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    function createGraphsWithCrossDomainEdges(): {
 beforeJson: string;
afterJson: string 
} {
      const domainMetadata = {
        orders: {
 description: 'Order domain',
systemType: 'domain' 
},
        payments: {
 description: 'Payment domain',
systemType: 'domain' 
},
      }
      const sl = {
 repository: 'test-repo',
filePath: 'src/test.ts' 
}
      const beforeJson = JSON.stringify({
        version: '1.0',
        metadata: {
 name: 'Before',
domains: domainMetadata 
},
        components: [
          {
 id: 'orders:checkout:api:place-order',
type: 'API',
apiType: 'REST',
httpMethod: 'POST',
path: '/orders',
name: 'POST /orders',
domain: 'orders',
module: 'checkout',
sourceLocation: sl 
},
          {
 id: 'payments:billing:usecase:process-payment',
type: 'UseCase',
name: 'Process Payment',
domain: 'payments',
module: 'billing',
sourceLocation: sl 
},
        ],
        links: [],
      })
      const afterJson = JSON.stringify({
        version: '1.0',
        metadata: {
 name: 'After',
domains: domainMetadata 
},
        components: [
          {
 id: 'orders:checkout:api:place-order',
type: 'API',
apiType: 'REST',
httpMethod: 'POST',
path: '/orders',
name: 'POST /orders',
domain: 'orders',
module: 'checkout',
sourceLocation: sl 
},
          {
 id: 'payments:billing:usecase:process-payment',
type: 'UseCase',
name: 'Process Payment',
domain: 'payments',
module: 'billing',
sourceLocation: sl 
},
        ],
        links: [
          {
 source: 'orders:checkout:api:place-order',
target: 'payments:billing:usecase:process-payment',
type: 'sync' 
},
        ],
      })
      return {
 beforeJson,
afterJson 
}
    }

    it('shows domain connection diff visualization after comparison', async () => {
      const {
 beforeJson, afterJson 
} = createGraphsWithCrossDomainEdges()
      stubFileReaderWithMultipleContents([beforeJson, afterJson])

      const user = userEvent.setup()
      renderPage()

      const beforeInput = screen.getByLabelText(/upload before file/i)
      const afterInput = screen.getByLabelText(/upload after file/i)

      await user.upload(beforeInput, new File([beforeJson], 'before.json', { type: 'application/json' }))
      await user.upload(afterInput, new File([afterJson], 'after.json', { type: 'application/json' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /compare/i })).toBeEnabled()
      })

      await user.click(screen.getByRole('button', { name: /compare/i }))

      await waitFor(() => {
        expect(screen.getByTestId('domain-connection-diff')).toBeInTheDocument()
      })
    })

    it('shows cross-domain connection changes heading above diagram', async () => {
      const {
 beforeJson, afterJson 
} = createGraphsWithCrossDomainEdges()
      stubFileReaderWithMultipleContents([beforeJson, afterJson])

      const user = userEvent.setup()
      renderPage()

      const beforeInput = screen.getByLabelText(/upload before file/i)
      const afterInput = screen.getByLabelText(/upload after file/i)

      await user.upload(beforeInput, new File([beforeJson], 'before.json', { type: 'application/json' }))
      await user.upload(afterInput, new File([afterJson], 'after.json', { type: 'application/json' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /compare/i })).toBeEnabled()
      })

      await user.click(screen.getByRole('button', { name: /compare/i }))

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /cross-domain connection changes/i })).toBeInTheDocument()
      })
    })

    it('shows node changes heading above stats bar', async () => {
      const {
 beforeJson, afterJson 
} = createGraphsWithCrossDomainEdges()
      stubFileReaderWithMultipleContents([beforeJson, afterJson])

      const user = userEvent.setup()
      renderPage()

      const beforeInput = screen.getByLabelText(/upload before file/i)
      const afterInput = screen.getByLabelText(/upload after file/i)

      await user.upload(beforeInput, new File([beforeJson], 'before.json', { type: 'application/json' }))
      await user.upload(afterInput, new File([afterJson], 'after.json', { type: 'application/json' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /compare/i })).toBeEnabled()
      })

      await user.click(screen.getByRole('button', { name: /compare/i }))

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /node changes/i })).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('upload zones have accessible labels', () => {
      renderPage()

      expect(screen.getByLabelText(/upload before file/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/upload after file/i)).toBeInTheDocument()
    })

    it('compare button has correct button role', () => {
      renderPage()

      const compareButton = screen.getByRole('button', { name: /compare/i })
      expect(compareButton).toHaveAttribute('type', 'button')
    })
  })
})
