import {
  describe, it, expect 
} from 'vitest';
import {
  render, screen 
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { FlowsPage } from './FlowsPage';
import type { RiviereGraph } from '@/types/riviere';
import {
  parseNode, parseEdge, parseDomainMetadata 
} from '@/lib/riviereTestFixtures';
const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
};

function renderWithRouter(graph: RiviereGraph): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <FlowsPage graph={graph} />
    </MemoryRouter>,
  );
}

function createTestGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      domains: parseDomainMetadata({
        'test-domain': {
          description: 'Test domain',
          systemType: 'domain',
        },
      }),
    },
    components: [
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'ui-1',
        type: 'UI',
        name: 'Order Form',
        domain: 'checkout',
        module: 'ui',
        route: '/orders',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'api-1',
        type: 'API',
        name: 'GET /health',
        domain: 'app',
        module: 'api',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/health',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'job-1',
        type: 'Custom',
        name: 'Daily Report',
        domain: 'reporting',
        module: 'jobs',
        customTypeName: 'ScheduledJob',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'uc-1',
        type: 'UseCase',
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
      }),
    ],
    links: [
      parseEdge({
        source: 'ui-1',
        target: 'uc-1',
        type: 'sync',
      }),
    ],
  };
}

describe('FlowsPage', () => {
  describe('page header', () => {
    it('renders title with page-title class', () => {
      renderWithRouter(createTestGraph());

      const title = screen.getByRole('heading', { name: 'Flows' });
      expect(title).toHaveClass('page-title');
    });

    it('renders subtitle with page-subtitle class', () => {
      renderWithRouter(createTestGraph());

      const subtitle = screen.getByText('Entry points and their traces through the system');
      expect(subtitle).toHaveClass('page-subtitle');
    });
  });

  describe('stats bar', () => {
    it('renders stats-bar container', () => {
      renderWithRouter(createTestGraph());

      expect(screen.getByTestId('stats-bar')).toHaveClass('stats-bar');
    });

    it('renders Total Flows stat with icon and count', () => {
      renderWithRouter(createTestGraph());

      expect(screen.getByText('Total Flows')).toHaveClass('stats-bar-label');
      const totalValue = screen.getByTestId('stat-total-flows');
      expect(totalValue).toHaveClass('stats-bar-value');
      expect(totalValue).toHaveTextContent('3');
    });

    it('renders UI Entries stat with icon and count', () => {
      renderWithRouter(createTestGraph());

      expect(screen.getByText('UI Entries')).toHaveClass('stats-bar-label');
      const uiValue = screen.getByTestId('stat-ui-entries');
      expect(uiValue).toHaveClass('stats-bar-value');
      expect(uiValue).toHaveTextContent('1');
    });

    it('renders API Entries stat with icon and count', () => {
      renderWithRouter(createTestGraph());

      expect(screen.getByText('API Entries')).toHaveClass('stats-bar-label');
      const apiValue = screen.getByTestId('stat-api-entries');
      expect(apiValue).toHaveClass('stats-bar-value');
      expect(apiValue).toHaveTextContent('1');
    });

    it('renders Scheduled Jobs stat with icon and count', () => {
      renderWithRouter(createTestGraph());

      expect(screen.getByText('Scheduled Jobs')).toHaveClass('stats-bar-label');
      const jobsValue = screen.getByTestId('stat-scheduled-jobs');
      expect(jobsValue).toHaveClass('stats-bar-value');
      expect(jobsValue).toHaveTextContent('1');
    });
  });

  describe('filtering', () => {
    it('filters by search query', async () => {
      const user = userEvent.setup();

      renderWithRouter(createTestGraph());

      await user.type(screen.getByPlaceholderText('Search flows...'), 'Order');

      expect(screen.getByText('Order Form')).toBeInTheDocument();
      expect(screen.queryByText('GET /health')).not.toBeInTheDocument();
      expect(screen.queryByText('Daily Report')).not.toBeInTheDocument();
    });

    it('filters by UI type', async () => {
      const user = userEvent.setup();

      renderWithRouter(createTestGraph());

      await user.click(screen.getByRole('button', { name: 'UI' }));

      expect(screen.getByText('Order Form')).toBeInTheDocument();
      expect(screen.queryByText('GET /health')).not.toBeInTheDocument();
      expect(screen.queryByText('Daily Report')).not.toBeInTheDocument();
    });

    it('filters by API type', async () => {
      const user = userEvent.setup();

      renderWithRouter(createTestGraph());

      await user.click(screen.getByRole('button', { name: 'API' }));

      expect(screen.queryByText('Order Form')).not.toBeInTheDocument();
      expect(screen.getByText('GET /health')).toBeInTheDocument();
      expect(screen.queryByText('Daily Report')).not.toBeInTheDocument();
    });

    it('filters by Jobs type', async () => {
      const user = userEvent.setup();

      renderWithRouter(createTestGraph());

      await user.click(screen.getByRole('button', { name: 'Jobs' }));

      expect(screen.queryByText('Order Form')).not.toBeInTheDocument();
      expect(screen.queryByText('GET /health')).not.toBeInTheDocument();
      expect(screen.getByText('Daily Report')).toBeInTheDocument();
    });

    it('shows all flows when All filter selected', async () => {
      const user = userEvent.setup();

      renderWithRouter(createTestGraph());

      await user.click(screen.getByRole('button', { name: 'API' }));
      await user.click(screen.getByRole('button', { name: 'All' }));

      expect(screen.getByText('Order Form')).toBeInTheDocument();
      expect(screen.getByText('GET /health')).toBeInTheDocument();
      expect(screen.getByText('Daily Report')).toBeInTheDocument();
    });
  });

  describe('flow cards', () => {
    it('expands flow card when clicked', async () => {
      const user = userEvent.setup();

      renderWithRouter(createTestGraph());

      expect(screen.queryByTestId('flow-trace')).not.toBeInTheDocument();

      const flowCardHeaders = screen.getAllByTestId('flow-card-header');
      const firstHeader = flowCardHeaders[0];
      if (firstHeader === undefined) {
        throw new Error('No flow card headers found');
      }
      await user.click(firstHeader);

      expect(screen.getByTestId('flow-trace')).toBeInTheDocument();
    });
  });
});
