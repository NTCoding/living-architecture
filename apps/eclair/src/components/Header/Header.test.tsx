import {
  render, screen 
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  describe, expect, it, vi 
} from 'vitest';
import { Header } from './Header';
import type {
  RiviereGraph, GraphName 
} from '@/types/riviere';
import {
  nodeIdSchema, domainNameSchema, moduleNameSchema, graphNameSchema 
} from '@/types/riviere';
import { parseDomainMetadata } from '@/lib/riviereTestFixtures';

const mockNavigate = vi.fn();
const mockClearGraph = vi.fn();

vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

vi.mock('@/contexts/GraphContext', () => ({ useGraph: () => ({ clearGraph: mockClearGraph }) }));

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
};

function createGraphName(name: string): GraphName {
  return graphNameSchema.parse(name);
}

function createTestGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'test-graph',
      description: 'Test graph',
      generated: '2024-01-15T10:30:00Z',
      domains: parseDomainMetadata({
        orders: {
          description: 'Order management',
          systemType: 'domain',
        },
      }),
    },
    components: [
      {
        sourceLocation: testSourceLocation,
        id: nodeIdSchema.parse('node-1'),
        type: 'API',
        apiType: 'REST',
        httpMethod: 'POST',
        path: '/orders',
        name: 'POST /orders',
        domain: domainNameSchema.parse('orders'),
        module: moduleNameSchema.parse('api'),
      },
    ],
    links: [],
  };
}

describe('Header', () => {
  it('renders upload graph button', () => {
    render(<Header graphName={undefined} graph={null} />);

    expect(screen.getByRole('button', { name: /Upload Graph/i })).toBeInTheDocument();
  });

  it('displays graph metadata name when graph provided', () => {
    render(<Header graphName={createGraphName('test.json')} graph={createTestGraph()} />);

    expect(screen.getByText('test-graph')).toBeInTheDocument();
  });

  it('does not display graph name when graph is null', () => {
    render(<Header graphName={undefined} graph={null} />);

    expect(screen.queryByText('test-graph')).not.toBeInTheDocument();
  });

  it('renders upload icon', () => {
    render(<Header graphName={undefined} graph={null} />);

    const icon = document.querySelector('.ph-upload');
    expect(icon).toBeInTheDocument();
  });

  describe('schema modal trigger', () => {
    it('renders graph name as clickable button when graph exists', () => {
      render(<Header graphName={createGraphName('test-schema.json')} graph={createTestGraph()} />);

      expect(screen.getByRole('button', { name: /test-graph/i })).toBeInTheDocument();
    });

    it('opens schema modal when graph name clicked', async () => {
      const user = userEvent.setup();

      render(<Header graphName={createGraphName('test-schema.json')} graph={createTestGraph()} />);

      await user.click(screen.getByRole('button', { name: /test-graph/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('passes graph data to schema modal', async () => {
      const user = userEvent.setup();
      const graph = createTestGraph();

      render(<Header graphName={createGraphName('test-schema.json')} graph={graph} />);

      await user.click(screen.getByRole('button', { name: /test-graph/i }));

      const jsonViewer = screen.getByTestId('json-viewer');
      expect(jsonViewer.textContent).toContain('"version"');
    });

    it('closes modal when close button clicked', async () => {
      const user = userEvent.setup();

      render(<Header graphName={createGraphName('test-schema.json')} graph={createTestGraph()} />);

      await user.click(screen.getByRole('button', { name: /test-graph/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes modal when Escape pressed', async () => {
      const user = userEvent.setup();

      render(<Header graphName={createGraphName('test-schema.json')} graph={createTestGraph()} />);

      await user.click(screen.getByRole('button', { name: /test-graph/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not render schema button when graph is null', () => {
      render(<Header graphName={undefined} graph={null} />);

      expect(screen.queryByRole('button', { name: /test-graph/i })).not.toBeInTheDocument();
    });
  });

  describe('upload graph button', () => {
    it('clears graph and navigates to home when clicked', async () => {
      const user = userEvent.setup();
      mockClearGraph.mockClear();
      mockNavigate.mockClear();

      render(<Header graphName={createGraphName('test.json')} graph={createTestGraph()} />);

      await user.click(screen.getByRole('button', { name: /Upload Graph/i }));

      expect(mockClearGraph).toHaveBeenCalledOnce();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('export dropdown', () => {
    it('renders export button when export handlers are provided', () => {
      render(
        <Header
          graphName={createGraphName('test.json')}
          graph={createTestGraph()}
          onExportPng={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('does not render export button when no export handlers provided', () => {
      render(<Header graphName={createGraphName('test.json')} graph={createTestGraph()} />);

      expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    });

    it('does not render export button when no graph', () => {
      render(<Header graphName={undefined} graph={null} />);

      expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument();
    });

    it('opens dropdown with PNG and SVG options on click', async () => {
      const user = userEvent.setup();

      render(
        <Header
          graphName={createGraphName('test.json')}
          graph={createTestGraph()}
          onExportPng={vi.fn()}
          onExportSvg={vi.fn()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /export/i }));

      expect(screen.getByRole('menuitem', { name: /png/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /svg/i })).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup();

      render(
        <Header
          graphName={createGraphName('test.json')}
          graph={createTestGraph()}
          onExportPng={vi.fn()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /export/i }));
      expect(screen.getByRole('menuitem', { name: /png/i })).toBeInTheDocument();

      await user.click(document.body);
      expect(screen.queryByRole('menuitem', { name: /png/i })).not.toBeInTheDocument();
    });

    it('closes dropdown when Escape pressed', async () => {
      const user = userEvent.setup();

      render(
        <Header
          graphName={createGraphName('test.json')}
          graph={createTestGraph()}
          onExportPng={vi.fn()}
        />,
      );

      await user.click(screen.getByRole('button', { name: /export/i }));
      expect(screen.getByRole('menuitem', { name: /png/i })).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menuitem', { name: /png/i })).not.toBeInTheDocument();
    });

    it('calls onExportPng when PNG option clicked', async () => {
      const user = userEvent.setup();
      const mockOnExportPng = vi.fn();

      render(
        <Header
          graphName={createGraphName('test.json')}
          graph={createTestGraph()}
          onExportPng={mockOnExportPng}
        />,
      );

      await user.click(screen.getByRole('button', { name: /export/i }));
      await user.click(screen.getByRole('menuitem', { name: /png/i }));

      expect(mockOnExportPng).toHaveBeenCalledOnce();
    });

    it('calls onExportSvg when SVG option clicked', async () => {
      const user = userEvent.setup();
      const mockOnExportSvg = vi.fn();

      render(
        <Header
          graphName={createGraphName('test.json')}
          graph={createTestGraph()}
          onExportSvg={mockOnExportSvg}
        />,
      );

      await user.click(screen.getByRole('button', { name: /export/i }));
      await user.click(screen.getByRole('menuitem', { name: /svg/i }));

      expect(mockOnExportSvg).toHaveBeenCalledOnce();
    });
  });

  describe('orphan warning', () => {
    it('displays orphan warning when graph has orphan nodes', () => {
      const graphWithOrphans: RiviereGraph = {
        version: '1.0',
        metadata: {
          name: 'test-graph-orphans',
          description: 'Test graph with orphans',
          generated: '2024-01-15T10:30:00Z',
          domains: {
            orders: {
              description: 'Order management',
              systemType: 'domain',
            },
          },
        },
        components: [
          {
            sourceLocation: testSourceLocation,
            id: nodeIdSchema.parse('node-1'),
            type: 'API',
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
            name: 'POST /orders',
            domain: domainNameSchema.parse('orders'),
            module: moduleNameSchema.parse('api'),
          },
          {
            sourceLocation: testSourceLocation,
            id: nodeIdSchema.parse('orphan-node'),
            type: 'DomainOp',
            operationName: 'placeOrder',
            name: 'Place Order',
            domain: domainNameSchema.parse('orders'),
            module: moduleNameSchema.parse('api'),
          },
        ],
        links: [],
      };

      render(<Header graphName={createGraphName('test.json')} graph={graphWithOrphans} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/2 nodes have no connections/)).toBeInTheDocument();
    });

    it('does not display orphan warning when no orphans detected', () => {
      const graphNoOrphans: RiviereGraph = {
        version: '1.0',
        metadata: {
          name: 'test-graph-no-orphans',
          description: 'Test graph without orphans',
          generated: '2024-01-15T10:30:00Z',
          domains: {
            orders: {
              description: 'Order management',
              systemType: 'domain',
            },
          },
        },
        components: [
          {
            sourceLocation: testSourceLocation,
            id: nodeIdSchema.parse('node-1'),
            type: 'API',
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
            name: 'POST /orders',
            domain: domainNameSchema.parse('orders'),
            module: moduleNameSchema.parse('api'),
          },
          {
            sourceLocation: testSourceLocation,
            id: nodeIdSchema.parse('node-2'),
            type: 'DomainOp',
            operationName: 'placeOrder',
            name: 'Place Order',
            domain: domainNameSchema.parse('orders'),
            module: moduleNameSchema.parse('api'),
          },
        ],
        links: [
          {
            sourceLocation: testSourceLocation,
            source: nodeIdSchema.parse('node-1'),
            target: nodeIdSchema.parse('node-2'),
            type: 'sync',
          },
        ],
      };

      render(<Header graphName={createGraphName('test.json')} graph={graphNoOrphans} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('displays warning with correct singular text for one orphan', () => {
      const graphWithOneOrphan: RiviereGraph = {
        version: '1.0',
        metadata: {
          name: 'test-graph',
          description: 'Test graph',
          generated: '2024-01-15T10:30:00Z',
          domains: {
            orders: {
              description: 'Order management',
              systemType: 'domain',
            },
          },
        },
        components: [
          {
            sourceLocation: testSourceLocation,
            id: nodeIdSchema.parse('orphan-node'),
            type: 'DomainOp',
            operationName: 'orphan',
            name: 'Orphan Operation',
            domain: domainNameSchema.parse('orders'),
            module: moduleNameSchema.parse('api'),
          },
        ],
        links: [],
      };

      render(<Header graphName={createGraphName('test.json')} graph={graphWithOneOrphan} />);

      expect(screen.getByText(/1 node has no connections/)).toBeInTheDocument();
    });

    it('opens modal when warning is clicked', async () => {
      const user = userEvent.setup();
      const graphWithOrphans: RiviereGraph = {
        version: '1.0',
        metadata: {
          name: 'test-graph-orphans',
          description: 'Test graph with orphans',
          generated: '2024-01-15T10:30:00Z',
          domains: {
            orders: {
              description: 'Order management',
              systemType: 'domain',
            },
          },
        },
        components: [
          {
            sourceLocation: testSourceLocation,
            id: nodeIdSchema.parse('node-1'),
            type: 'API',
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
            name: 'POST /orders',
            domain: domainNameSchema.parse('orders'),
            module: moduleNameSchema.parse('api'),
          },
          {
            sourceLocation: testSourceLocation,
            id: nodeIdSchema.parse('orphan-node'),
            type: 'DomainOp',
            operationName: 'placeOrder',
            name: 'Place Order',
            domain: domainNameSchema.parse('orders'),
            module: moduleNameSchema.parse('api'),
          },
        ],
        links: [],
      };

      render(<Header graphName={createGraphName('test.json')} graph={graphWithOrphans} />);

      await user.click(screen.getByText(/Click to view details/));

      expect(screen.getByText('Orphan Nodes (2)')).toBeInTheDocument();
      expect(screen.getByText('POST /orders')).toBeInTheDocument();
      expect(screen.getByText('Place Order')).toBeInTheDocument();
    });

    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup();
      const graphWithOrphans: RiviereGraph = {
        version: '1.0',
        metadata: {
          name: 'test-graph-orphans',
          description: 'Test graph with orphans',
          generated: '2024-01-15T10:30:00Z',
          domains: {
            orders: {
              description: 'Order management',
              systemType: 'domain',
            },
          },
        },
        components: [
          {
            sourceLocation: testSourceLocation,
            id: nodeIdSchema.parse('node-1'),
            type: 'API',
            apiType: 'REST',
            httpMethod: 'POST',
            path: '/orders',
            name: 'POST /orders',
            domain: domainNameSchema.parse('orders'),
            module: moduleNameSchema.parse('api'),
          },
          {
            sourceLocation: testSourceLocation,
            id: nodeIdSchema.parse('orphan-node'),
            type: 'DomainOp',
            operationName: 'placeOrder',
            name: 'Place Order',
            domain: domainNameSchema.parse('orders'),
            module: moduleNameSchema.parse('api'),
          },
        ],
        links: [],
      };

      render(<Header graphName={createGraphName('test.json')} graph={graphWithOrphans} />);

      await user.click(screen.getByText(/Click to view details/));
      expect(screen.getByText('Orphan Nodes (2)')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close modal');
      await user.click(closeButton);

      expect(screen.queryByText('Orphan Nodes (2)')).not.toBeInTheDocument();
    });

    it('closes banner when close icon is clicked', async () => {
      const user = userEvent.setup();
      const graphWithOrphans: RiviereGraph = {
        version: '1.0',
        metadata: {
          name: 'test-graph-orphans',
          description: 'Test graph with orphans',
          generated: '2024-01-15T10:30:00Z',
          domains: {
            orders: {
              description: 'Order management',
              systemType: 'domain',
            },
          },
        },
        components: [
          {
            sourceLocation: testSourceLocation,
            id: nodeIdSchema.parse('orphan-node'),
            type: 'DomainOp',
            operationName: 'orphan',
            name: 'Orphan Operation',
            domain: domainNameSchema.parse('orders'),
            module: moduleNameSchema.parse('api'),
          },
        ],
        links: [],
      };

      render(<Header graphName={createGraphName('test.json')} graph={graphWithOrphans} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();

      const closeButton = screen.getByLabelText('Close orphan warning');
      await user.click(closeButton);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
