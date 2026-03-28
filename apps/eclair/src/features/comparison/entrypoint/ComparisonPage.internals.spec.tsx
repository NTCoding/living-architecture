import '@testing-library/jest-dom/vitest'
import {
  render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  describe, expect, it 
} from 'vitest'
import type { GraphDiff } from '../queries/compare-graphs'
import {
  buildChangeItems,
  ChangeItem,
  DetailedChanges,
  extractUniqueDomains,
  extractUniqueTypes,
  parseGraphFile,
} from './ComparisonPage'

const diff: GraphDiff = {
  nodes: {
    unchanged: [],
    added: [
      {
        node: {
          id: 'new',
          type: 'API',
          apiType: 'REST',
          httpMethod: 'GET',
          path: '/new',
          name: 'New API',
          domain: 'payments',
          module: 'api',
          description: 'new description',
          sourceLocation: {
            repository: 'repo',
            filePath: 'src/new.ts',
          },
        },
      },
    ],
    removed: [
      {
        node: {
          id: 'old',
          type: 'UseCase',
          name: 'Old Use Case',
          domain: 'orders',
          module: 'core',
          sourceLocation: {
            repository: 'repo',
            filePath: 'src/old.ts',
          },
        },
      },
    ],
    modified: [
      {
        before: {
          id: 'same',
          type: 'Event',
          eventName: 'OrderPlaced',
          name: 'OrderPlaced',
          domain: 'orders',
          module: 'events',
          sourceLocation: {
            repository: 'repo',
            filePath: 'src/event-before.ts',
          },
        },
        after: {
          id: 'same',
          type: 'Event',
          eventName: 'OrderPlaced',
          name: 'OrderPlaced',
          domain: 'orders',
          module: 'events',
          sourceLocation: {
            repository: 'repo',
            filePath: 'src/event-after.ts',
          },
        },
        changedFields: ['description', 'sourceLocation.filePath'],
      },
    ],
  },
  edges: {
    added: [],
    removed: [],
    modified: [],
    unchanged: [],
  },
  stats: {
    nodesAdded: 1,
    nodesRemoved: 1,
    nodesModified: 1,
    nodesUnchanged: 0,
    edgesAdded: 0,
    edgesRemoved: 0,
    edgesModified: 0,
    edgesUnchanged: 0,
  },
  byDomain: {},
  byNodeType: {},
}

describe('ComparisonPage internals', () => {
  function requireItem(index: number) {
    const item = buildChangeItems(diff)[index]
    if (item === undefined) {
      throw new TypeError(`Missing change item at index ${index}`)
    }
    return item
  }

  it('builds change items and extracts sorted domains and types', () => {
    const items = buildChangeItems(diff)

    expect(items).toHaveLength(3)
    expect(items.map((item) => item.changeType)).toStrictEqual(['added', 'removed', 'modified'])
    expect(extractUniqueDomains(items)).toStrictEqual(['orders', 'payments'])
    expect(extractUniqueTypes(items)).toStrictEqual(['API', 'Event', 'UseCase'])
  })

  it('parses valid graph files and returns errors for invalid json', () => {
    expect(
      parseGraphFile(
        JSON.stringify({
          version: '1.0',
          metadata: {
            domains: {
              test: {
                description: 'Test domain',
                systemType: 'domain' 
              } 
            } 
          },
          components: [],
          links: [],
        }),
        'valid.json',
      ),
    ).toStrictEqual({
      status: 'loaded',
      file: {
        name: 'valid.json',
        graph: {
          version: '1.0',
          metadata: {
            domains: {
              test: {
                description: 'Test domain',
                systemType: 'domain' 
              } 
            } 
          },
          components: [],
          links: [],
        },
      },
    })

    expect(parseGraphFile('{invalid', 'broken.json')).toStrictEqual({
      status: 'error',
      error: { message: expect.stringMatching(/expected property name|json/i) },
    })
  })

  it('renders change item details for modified nodes', () => {
    render(<ChangeItem item={requireItem(2)} />)

    expect(screen.getByText('Event')).toBeInTheDocument()
    expect(screen.getByText('OrderPlaced')).toBeInTheDocument()
    expect(screen.getByText(/Changed: description, sourceLocation.filePath/)).toBeInTheDocument()
    expect(screen.getByText('~ MODIFIED')).toBeInTheDocument()
  })

  it('filters detailed changes by change kind and domain', async () => {
    const user = userEvent.setup()
    render(<DetailedChanges diff={diff} />)

    expect(
      ['New API', 'Old Use Case', 'OrderPlaced'].map((text) => screen.getByText(text)),
    ).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: /modified/i }))
    expect(screen.queryByText('New API')).not.toBeInTheDocument()
    expect(screen.getByText('OrderPlaced')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'payments' }))
    expect(screen.getByText(/No changes to display/)).toBeInTheDocument()
  })

  it('filters detailed changes by type', async () => {
    const user = userEvent.setup()
    render(<DetailedChanges diff={diff} />)

    await user.click(screen.getByRole('button', { name: 'API' }))
    expect(screen.getByText('New API')).toBeInTheDocument()
    expect(screen.queryByText('Old Use Case')).not.toBeInTheDocument()
  })
})
