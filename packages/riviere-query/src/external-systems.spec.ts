import {
  describe, it, expect 
} from 'vitest';
import { queryExternalDomains } from './external-system-queries';
import {
  createMinimalValidGraph,
  createAPIComponent,
  createUseCaseComponent,
} from './riviere-graph-fixtures';
import { parseDomainName } from './domain-types';

describe('queryExternalDomains', () => {
  it('returns empty array when graph has no external links', () => {
    const graph = createMinimalValidGraph();

    const result = queryExternalDomains(graph);

    expect(result).toEqual([]);
  });

  it('returns each external target as a separate external domain', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createAPIComponent({
        id: 'orders:api:pay',
        name: 'Pay',
        domain: 'orders',
      }),
    );
    graph.externalLinks = [
      {
        source: 'orders:api:pay',
        target: { name: 'Stripe' },
        type: 'sync',
      },
      {
        source: 'orders:api:pay',
        target: { name: 'Twilio' },
        type: 'sync',
      },
    ];

    const result = queryExternalDomains(graph);

    expect(result).toHaveLength(2);
    expect(
      result.map((d) => d.name).sort((a, b) => a.localeCompare(b)),
    ).toEqual(['Stripe', 'Twilio']);
  });

  it('includes source domain for each external domain', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createAPIComponent({
        id: 'orders:api:pay',
        name: 'Pay',
        domain: 'orders',
      }),
    );
    graph.externalLinks = [
      {
        source: 'orders:api:pay',
        target: { name: 'Stripe' },
        type: 'sync',
      },
    ];

    const result = queryExternalDomains(graph);

    expect(result[0]?.sourceDomains).toEqual([parseDomainName('orders')]);
  });

  it('aggregates multiple source domains for same external domain', () => {
    const graph = createMinimalValidGraph();
    graph.metadata.domains['payments'] = {
      description: 'Payments',
      systemType: 'domain',
    };
    graph.components.push(
      createAPIComponent({
        id: 'orders:api:pay',
        name: 'Order Pay',
        domain: 'orders',
      }),
      createAPIComponent({
        id: 'payments:api:charge',
        name: 'Charge',
        domain: 'payments',
      }),
    );
    graph.externalLinks = [
      {
        source: 'orders:api:pay',
        target: { name: 'Stripe' },
        type: 'sync',
      },
      {
        source: 'payments:api:charge',
        target: { name: 'Stripe' },
        type: 'sync',
      },
    ];

    const result = queryExternalDomains(graph);

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Stripe');
    expect(result[0]?.sourceDomains.sort((a, b) => a.localeCompare(b))).toEqual(
      [parseDomainName('orders'), parseDomainName('payments')].sort((a, b) =>
        a.localeCompare(b),
      ),
    );
  });

  it('counts connections to each external domain', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createAPIComponent({
        id: 'orders:api:pay',
        name: 'Pay',
        domain: 'orders',
      }),
      createUseCaseComponent({
        id: 'orders:uc:checkout',
        name: 'Checkout',
        domain: 'orders',
      }),
    );
    graph.externalLinks = [
      {
        source: 'orders:api:pay',
        target: { name: 'Stripe' },
        type: 'sync',
      },
      {
        source: 'orders:uc:checkout',
        target: { name: 'Stripe' },
        type: 'sync',
      },
      {
        source: 'orders:api:pay',
        target: { name: 'Twilio' },
        type: 'sync',
      },
    ];

    const result = queryExternalDomains(graph);

    const stripe = result.find((d) => d.name === 'Stripe');
    const twilio = result.find((d) => d.name === 'Twilio');

    expect(stripe?.connectionCount).toBe(2);
    expect(twilio?.connectionCount).toBe(1);
  });

  it('deduplicates source domains for same external domain', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createAPIComponent({
        id: 'orders:api:pay',
        name: 'Pay',
        domain: 'orders',
      }),
      createUseCaseComponent({
        id: 'orders:uc:checkout',
        name: 'Checkout',
        domain: 'orders',
      }),
    );
    graph.externalLinks = [
      {
        source: 'orders:api:pay',
        target: { name: 'Stripe' },
        type: 'sync',
      },
      {
        source: 'orders:uc:checkout',
        target: { name: 'Stripe' },
        type: 'sync',
      },
    ];

    const result = queryExternalDomains(graph);

    expect(result[0]?.sourceDomains).toEqual([parseDomainName('orders')]);
  });

  it('skips external links with unknown source component', () => {
    const graph = createMinimalValidGraph();
    graph.externalLinks = [
      {
        source: 'unknown-node',
        target: { name: 'Stripe' },
        type: 'sync',
      },
    ];

    const result = queryExternalDomains(graph);

    expect(result).toEqual([]);
  });

  it('sorts external domains alphabetically by name', () => {
    const graph = createMinimalValidGraph();
    graph.components.push(
      createAPIComponent({
        id: 'orders:api:pay',
        name: 'Pay',
        domain: 'orders',
      }),
    );
    graph.externalLinks = [
      {
        source: 'orders:api:pay',
        target: { name: 'Twilio' },
        type: 'sync',
      },
      {
        source: 'orders:api:pay',
        target: { name: 'Stripe' },
        type: 'sync',
      },
      {
        source: 'orders:api:pay',
        target: { name: 'AWS' },
        type: 'sync',
      },
    ];

    const result = queryExternalDomains(graph);

    expect(result.map((d) => d.name)).toEqual(['AWS', 'Stripe', 'Twilio']);
  });
});
