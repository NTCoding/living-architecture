import {
  describe, expect, it 
} from 'vitest'
import { parseNode } from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import { buildDomainClusters } from './buildDomainClusters'

const sourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

describe('buildDomainClusters', () => {
  it('groups nodes by domain, excludes external nodes, and sorts ids', () => {
    const nodes = [
      parseNode({
        sourceLocation,
        id: 'shipping-b',
        type: 'API',
        name: 'Shipping B',
        domain: 'shipping',
        module: 'api',
      }),
      parseNode({
        sourceLocation,
        id: 'orders-a',
        type: 'API',
        name: 'Orders A',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation,
        id: 'orders-b',
        type: 'UseCase',
        name: 'Orders B',
        domain: 'orders',
        module: 'core',
      }),
      parseNode({
        sourceLocation,
        id: 'external-1',
        type: 'API',
        name: 'Vendor',
        domain: 'external',
        module: 'external',
      }),
    ]

    expect(buildDomainClusters(nodes)).toStrictEqual([
      {
        id: 'cluster_domain_orders',
        domain: 'orders',
        label: 'orders',
        nodeIds: ['orders-a', 'orders-b'],
      },
      {
        id: 'cluster_domain_shipping',
        domain: 'shipping',
        label: 'shipping',
        nodeIds: ['shipping-b'],
      },
    ])
  })

  it('normalizes punctuation-heavy domains into stable cluster ids', () => {
    const nodes = [
      parseNode({
        sourceLocation,
        id: 'node-1',
        type: 'API',
        name: 'Billing API',
        domain: 'Billing & Payments / Core',
        module: 'api',
      }),
    ]

    expect(buildDomainClusters(nodes)).toStrictEqual([
      {
        id: 'cluster_domain_billing_payments_core',
        domain: 'Billing & Payments / Core',
        label: 'Billing & Payments / Core',
        nodeIds: ['node-1'],
      },
    ])
  })

  it('falls back to unknown when the domain contains no alphanumeric characters', () => {
    const nodes = [
      parseNode({
        sourceLocation,
        id: 'node-1',
        type: 'API',
        name: 'Mystery API',
        domain: '---',
        module: 'api',
      }),
    ]

    expect(buildDomainClusters(nodes)[0]?.id).toBe('cluster_domain_unknown')
  })

  it('keeps lowercase letters and digits without adding separators', () => {
    const nodes = [
      parseNode({
        sourceLocation,
        id: 'node-1',
        type: 'API',
        name: 'Alpha API',
        domain: 'alpha42',
        module: 'api',
      }),
    ]

    expect(buildDomainClusters(nodes)[0]?.id).toBe('cluster_domain_alpha42')
  })

  it('trims a trailing separator added by punctuation', () => {
    const nodes = [
      parseNode({
        sourceLocation,
        id: 'node-1',
        type: 'API',
        name: 'Alpha API',
        domain: 'alpha!',
        module: 'api',
      }),
    ]

    expect(buildDomainClusters(nodes)[0]?.id).toBe('cluster_domain_alpha')
  })
})
