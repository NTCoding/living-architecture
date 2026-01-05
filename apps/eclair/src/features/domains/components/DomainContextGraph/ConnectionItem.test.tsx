import {
  describe, it, expect 
} from 'vitest';
import {
  render, screen 
} from '@testing-library/react';
import { ConnectionItem } from './ConnectionItem';
import type { AggregatedConnection } from '../../extractDomainDetails';

describe('ConnectionItem', () => {
  it('renders outgoing connection with domain names', () => {
    const connection: AggregatedConnection = {
      targetDomain: 'inventory',
      direction: 'outgoing',
      apiCount: 1,
      eventCount: 0,
    };

    render(
      <ConnectionItem
        connection={connection}
        currentDomainId="orders"
        targetDomainId="inventory"
      />,
    );

    expect(screen.getByText('orders')).toBeInTheDocument();
    expect(screen.getByText('inventory')).toBeInTheDocument();
  });

  it('displays API call count', () => {
    const connection: AggregatedConnection = {
      targetDomain: 'inventory',
      direction: 'outgoing',
      apiCount: 2,
      eventCount: 0,
    };

    render(
      <ConnectionItem
        connection={connection}
        currentDomainId="orders"
        targetDomainId="inventory"
      />,
    );

    expect(screen.getByText('2 API calls')).toBeInTheDocument();
  });

  it('displays event count', () => {
    const connection: AggregatedConnection = {
      targetDomain: 'shipping',
      direction: 'outgoing',
      apiCount: 0,
      eventCount: 1,
    };

    render(
      <ConnectionItem connection={connection} currentDomainId="orders" targetDomainId="shipping" />,
    );

    expect(screen.getByText('1 event')).toBeInTheDocument();
  });

  it('displays both API and event counts when present', () => {
    const connection: AggregatedConnection = {
      targetDomain: 'inventory',
      direction: 'outgoing',
      apiCount: 1,
      eventCount: 1,
    };

    render(
      <ConnectionItem
        connection={connection}
        currentDomainId="orders"
        targetDomainId="inventory"
      />,
    );

    expect(screen.getByText('1 API call')).toBeInTheDocument();
    expect(screen.getByText('1 event')).toBeInTheDocument();
  });
});
