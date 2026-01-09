import {
  render, screen
} from '@testing-library/react'
import { DomainDetailView } from './DomainDetailView'
import { extractDomainDetails } from './extractDomainDetails'
import {
  parseNode, parseDomainMetadata, parseDomainKey
} from '@/lib/riviereTestFixtures'
import type { RiviereGraph } from '@/types/riviere'
import { assertDefined } from '@/test-assertions'
const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

describe('DomainDetailView', () => {
  const mockGraph: RiviereGraph = {
    version: '1.0',
    components: [
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'node1',
        name: 'TestNode',
        type: 'API',
        apiType: 'other',
        domain: 'test-domain',
        module: 'test-module',
      }),
    ],
    links: [],
    metadata: {
      domains: parseDomainMetadata({
        'test-domain': {
          description: 'Test domain description',
          systemType: 'domain',
        },
      }),
    },
  }

  it('renders statistics row', () => {
    const domain = assertDefined(
      extractDomainDetails(mockGraph, parseDomainKey('test-domain')),
      'Expected domain to exist',
    )

    render(
      <DomainDetailView
        domain={domain}
        nodeSearch=""
        setNodeSearch={() => {}}
        nodeTypeFilter="all"
        setNodeTypeFilter={() => {}}
        entitySearch=""
        setEntitySearch={() => {}}
        eventSearch=""
        setEventSearch={() => {}}
      />,
    )

    expect(screen.getByTestId('stats-row')).toBeInTheDocument()
  })

  it('displays nodes section with filter', () => {
    const domain = assertDefined(
      extractDomainDetails(mockGraph, parseDomainKey('test-domain')),
      'Expected domain to exist',
    )

    render(
      <DomainDetailView
        domain={domain}
        nodeSearch=""
        setNodeSearch={() => {}}
        nodeTypeFilter="all"
        setNodeTypeFilter={() => {}}
        entitySearch=""
        setEntitySearch={() => {}}
        eventSearch=""
        setEventSearch={() => {}}
      />,
    )

    expect(screen.getByTestId('filters-section')).toBeInTheDocument()
    expect(screen.getByTestId('nodes-list')).toBeInTheDocument()
  })

  it('filters nodes by search query', () => {
    const domain = assertDefined(
      extractDomainDetails(mockGraph, parseDomainKey('test-domain')),
      'Expected domain to exist',
    )

    render(
      <DomainDetailView
        domain={domain}
        nodeSearch="Test"
        setNodeSearch={() => {}}
        nodeTypeFilter="all"
        setNodeTypeFilter={() => {}}
        entitySearch=""
        setEntitySearch={() => {}}
        eventSearch=""
        setEventSearch={() => {}}
      />,
    )

    expect(screen.getByText('TestNode')).toBeInTheDocument()
  })

  it('renders empty state when no nodes match search', () => {
    const domain = assertDefined(
      extractDomainDetails(mockGraph, parseDomainKey('test-domain')),
      'Expected domain to exist',
    )

    render(
      <DomainDetailView
        domain={domain}
        nodeSearch="NonExistent"
        setNodeSearch={() => {}}
        nodeTypeFilter="all"
        setNodeTypeFilter={() => {}}
        entitySearch=""
        setEntitySearch={() => {}}
        eventSearch=""
        setEventSearch={() => {}}
      />,
    )

    expect(screen.getByText('No nodes match your search')).toBeInTheDocument()
  })
})
