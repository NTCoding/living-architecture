import type {
  Component,
  ExternalLink,
  Link,
} from '@living-architecture/riviere-schema-published-language/schema'
import { describe, expect, it } from 'vitest'
import { WorkflowDiagnostic } from './workflow-diagnostic'
import { WorkflowStateSnapshot } from './workflow-transition-snapshot'

describe('WorkflowStateSnapshot', () => {
  it('is immutable when inputs are mutated', () => {
    const component: Component = {
      type: 'UI',
      id: 'component-1',
      name: 'Orders UI',
      domain: 'orders',
      module: 'orders',
      route: '/orders',
      sourceLocation: { repository: 'shop', filePath: 'orders.ts' },
    }
    const components: Component[] = [component]
    const diagnostics = [WorkflowDiagnostic.fromMissingField('component-1', 'description')]
    const externalLinks: ExternalLink[] = [
      { source: 'component-1', target: { name: 'Stripe', url: 'https://stripe.com' } },
    ]
    const links: Link[] = [{ source: 'component-1', target: 'component-2' }]
    const snapshot = WorkflowStateSnapshot.from({
      components,
      diagnostics,
      externalLinks,
      links,
    })

    component.name = 'mutated'
    components.length = 0
    diagnostics.length = 0
    externalLinks.length = 0
    links.length = 0

    expect(snapshot.components).toStrictEqual([
      {
        type: 'UI',
        id: 'component-1',
        name: 'Orders UI',
        domain: 'orders',
        module: 'orders',
        route: '/orders',
        sourceLocation: { repository: 'shop', filePath: 'orders.ts' },
      },
    ])
    expect(snapshot.diagnostics).toHaveLength(1)
    expect(snapshot.externalLinks).toStrictEqual([
      { source: 'component-1', target: { name: 'Stripe', url: 'https://stripe.com' } },
    ])
    expect(snapshot.links).toStrictEqual([{ source: 'component-1', target: 'component-2' }])
  })
})
