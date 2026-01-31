import {
  describe, it, expect, vi, afterEach
} from 'vitest'
import {
  render, screen, waitFor
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ComparisonPage } from './ComparisonPage'
import { TestAssertionError } from '@/test-assertions'

function renderPage(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <ComparisonPage />
    </MemoryRouter>,
  )
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
        throw new TestAssertionError(
          `Mock FileReader called ${callCounter.index + 1} times but only ${contentArray.length} contents provided`,
        )
      }
      callCounter.index += 1
      this.result = content
      this.onload?.({ target: { result: content } })
    }
  }
  vi.stubGlobal('FileReader', MockFileReader)
}

function createComparisonGraphs(): {
  beforeJson: string
  afterJson: string
} {
  const domainMetadata = {
    orders: {
      description: 'Order domain',
      systemType: 'domain',
    },
  }
  const sl = {
    repository: 'test-repo',
    filePath: 'src/test.ts',
  }
  const beforeJson = JSON.stringify({
    version: '1.0',
    metadata: {
      name: 'Before',
      domains: domainMetadata,
    },
    components: [
      {
        id: 'orders:checkout:api:unchanged',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/orders',
        name: 'GET /orders',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: sl,
      },
      {
        id: 'orders:checkout:api:removed',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'DELETE',
        path: '/orders/:id',
        name: 'DELETE /orders/:id',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: sl,
      },
      {
        id: 'orders:checkout:api:modified',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders',
        name: 'POST /orders',
        domain: 'orders',
        module: 'checkout',
        description: 'Old description',
        sourceLocation: sl,
      },
    ],
    links: [],
  })
  const afterJson = JSON.stringify({
    version: '1.0',
    metadata: {
      name: 'After',
      domains: domainMetadata,
    },
    components: [
      {
        id: 'orders:checkout:api:unchanged',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/orders',
        name: 'GET /orders',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: sl,
      },
      {
        id: 'orders:checkout:api:added',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders/:id/refund',
        name: 'POST /orders/:id/refund',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: sl,
      },
      {
        id: 'orders:checkout:api:modified',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders',
        name: 'POST /orders',
        domain: 'orders',
        module: 'checkout',
        description: 'New description',
        sourceLocation: sl,
      },
    ],
    links: [],
  })
  return {
    beforeJson,
    afterJson,
  }
}

function createComparisonGraphsWithMultipleDomains(): {
  beforeJson: string
  afterJson: string
} {
  const domainMetadata = {
    orders: {
      description: 'Order domain',
      systemType: 'domain',
    },
    shipping: {
      description: 'Shipping domain',
      systemType: 'domain',
    },
  }
  const sl = {
    repository: 'test-repo',
    filePath: 'src/test.ts',
  }
  const beforeJson = JSON.stringify({
    version: '1.0',
    metadata: {
      name: 'Before',
      domains: domainMetadata,
    },
    components: [
      {
        id: 'orders:checkout:api:unchanged',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/orders',
        name: 'GET /orders',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: sl,
      },
    ],
    links: [],
  })
  const afterJson = JSON.stringify({
    version: '1.0',
    metadata: {
      name: 'After',
      domains: domainMetadata,
    },
    components: [
      {
        id: 'orders:checkout:api:unchanged',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/orders',
        name: 'GET /orders',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: sl,
      },
      {
        id: 'orders:checkout:api:added',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders/:id/refund',
        name: 'POST /orders/:id/refund',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: sl,
      },
      {
        id: 'shipping:fulfillment:usecase:added',
        type: 'UseCase',
        name: 'Create Shipment',
        domain: 'shipping',
        module: 'fulfillment',
        sourceLocation: sl,
      },
    ],
    links: [],
  })
  return {
    beforeJson,
    afterJson,
  }
}

function createComparisonGraphsWithMultipleTypes(): {
  beforeJson: string
  afterJson: string
} {
  const domainMetadata = {
    orders: {
      description: 'Order domain',
      systemType: 'domain',
    },
  }
  const sl = {
    repository: 'test-repo',
    filePath: 'src/test.ts',
  }
  const beforeJson = JSON.stringify({
    version: '1.0',
    metadata: {
      name: 'Before',
      domains: domainMetadata,
    },
    components: [
      {
        id: 'orders:checkout:api:unchanged',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/orders',
        name: 'GET /orders',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: sl,
      },
    ],
    links: [],
  })
  const afterJson = JSON.stringify({
    version: '1.0',
    metadata: {
      name: 'After',
      domains: domainMetadata,
    },
    components: [
      {
        id: 'orders:checkout:api:unchanged',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/orders',
        name: 'GET /orders',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: sl,
      },
      {
        id: 'orders:checkout:api:added',
        type: 'API',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders/:id/refund',
        name: 'POST /orders/:id/refund',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: sl,
      },
      {
        id: 'orders:checkout:usecase:added',
        type: 'UseCase',
        name: 'Process Refund',
        domain: 'orders',
        module: 'checkout',
        sourceLocation: sl,
      },
    ],
    links: [],
  })
  return {
    beforeJson,
    afterJson,
  }
}

async function setupComparisonAndCompare(
  user: ReturnType<typeof userEvent.setup>,
  beforeJson: string,
  afterJson: string,
): Promise<void> {
  const beforeInput = screen.getByLabelText(/upload before file/i)
  const afterInput = screen.getByLabelText(/upload after file/i)

  await user.upload(
    beforeInput,
    new File([beforeJson], 'before.json', { type: 'application/json' }),
  )
  await user.upload(afterInput, new File([afterJson], 'after.json', { type: 'application/json' }))

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /compare/i })).toBeEnabled()
  })

  await user.click(screen.getByRole('button', { name: /compare/i }))

  await waitFor(() => {
    expect(screen.getByText(/comparing versions/i)).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: /list/i }))

  await waitFor(() => {
    expect(screen.getByText(/detailed changes/i)).toBeInTheDocument()
  })
}

describe('ComparisonPage - detailed changes list', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows detailed changes section after comparison', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.getByText(/detailed changes/i)).toBeInTheDocument()
  })

  it('displays added nodes with their names', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.getByText('POST /orders/:id/refund')).toBeInTheDocument()
  })

  it('displays removed nodes with their names', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.getByText('DELETE /orders/:id')).toBeInTheDocument()
  })

  it('displays modified nodes with their names', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.getByText('POST /orders')).toBeInTheDocument()
  })

  it('shows change type indicator for added nodes', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.getByText(/\+ added/i)).toBeInTheDocument()
  })

  it('shows change type indicator for removed nodes', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.getByText(/- removed/i)).toBeInTheDocument()
  })

  it('shows change type indicator for modified nodes', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.getByText(/~ modified/i)).toBeInTheDocument()
  })

  it('shows filter tabs for change types', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.getByRole('button', { name: /all changes/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^added$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^removed$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^modified$/i })).toBeInTheDocument()
  })

  it('filters to show only added nodes when Added filter clicked', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    await user.click(screen.getByRole('button', { name: /^added$/i }))

    expect(screen.getByText('POST /orders/:id/refund')).toBeInTheDocument()
    expect(screen.queryByText('DELETE /orders/:id')).not.toBeInTheDocument()
    expect(screen.queryByText('POST /orders')).not.toBeInTheDocument()
  })

  it('filters to show only removed nodes when Removed filter clicked', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    await user.click(screen.getByRole('button', { name: /^removed$/i }))

    expect(screen.queryByText('POST /orders/:id/refund')).not.toBeInTheDocument()
    expect(screen.getByText('DELETE /orders/:id')).toBeInTheDocument()
    expect(screen.queryByText('POST /orders')).not.toBeInTheDocument()
  })

  it('filters to show only modified nodes when Modified filter clicked', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    await user.click(screen.getByRole('button', { name: /^modified$/i }))

    expect(screen.queryByText('POST /orders/:id/refund')).not.toBeInTheDocument()
    expect(screen.queryByText('DELETE /orders/:id')).not.toBeInTheDocument()
    expect(screen.getByText('POST /orders')).toBeInTheDocument()
  })

  it('shows domain and module for each change item', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.getAllByText(/orders · checkout/i).length).toBeGreaterThan(0)
  })

  it('hides upload section after comparison is shown', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphs()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()

    expect(screen.getAllByText(/drop json file/i)).toHaveLength(2)

    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.queryByText(/drop json file/i)).not.toBeInTheDocument()
  })

  it('shows domain filter options based on changed nodes', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphsWithMultipleDomains()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.getByRole('button', { name: /orders/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /shipping/i })).toBeInTheDocument()
  })

  it('filters by domain when domain filter clicked', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphsWithMultipleDomains()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    await user.click(screen.getByRole('button', { name: /orders/i }))

    expect(screen.getByText('POST /orders/:id/refund')).toBeInTheDocument()
    expect(screen.queryByText('Create Shipment')).not.toBeInTheDocument()
  })

  it('shows node type filter options based on changed nodes', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphsWithMultipleTypes()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    expect(screen.getByRole('button', { name: /^API$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^UseCase$/i })).toBeInTheDocument()
  })

  it('filters by node type when type filter clicked', async () => {
    const {
      beforeJson, afterJson 
    } = createComparisonGraphsWithMultipleTypes()
    stubFileReaderWithMultipleContents([beforeJson, afterJson])

    const user = userEvent.setup()
    renderPage()
    await setupComparisonAndCompare(user, beforeJson, afterJson)

    await user.click(screen.getByRole('button', { name: /^API$/i }))

    expect(screen.getByText('POST /orders/:id/refund')).toBeInTheDocument()
    expect(screen.queryByText('Process Refund')).not.toBeInTheDocument()
  })
})
