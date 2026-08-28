import { describe, expect, it } from 'vitest'
import type { PullRequestArchitectureChanges } from './architecture-review-diff'
import { renderArchitectureReview } from './architecture-review-markdown'

describe('architecture review Markdown', () => {
  it('renders non-table names without allowing Markdown structure injection', () => {
    const name = 'orders`[]()\n## forged'
    const report = renderArchitectureReview({
      subdomains: [
        {
          layers: {
            domain: emptyLayerChanges(),
            entrypoints: {
              added: {
                aggregates: [],
                items: [{ name: 'run', packageKind: 'application', role: 'cli-entrypoint' }],
              },
              removed: { aggregates: [], items: [] },
            },
            'use-cases': emptyLayerChanges(),
          },
          name,
        },
      ],
    })

    expect(report).toContain('- `` orders`[]() ## forged ``')
    expect(report).toContain('## Subdomain: `` orders`[]() ## forged ``')
    expect(report).not.toContain('\n## forged')
  })

  it('distinguishes same-named aggregates by package kind', () => {
    const report = renderArchitectureReview({
      subdomains: [
        {
          layers: {
            domain: {
              added: {
                aggregates: [
                  {
                    entities: [],
                    methods: [],
                    name: 'Order',
                    packageKind: 'domain-model',
                  },
                  {
                    entities: [],
                    methods: [],
                    name: 'Order',
                    packageKind: 'published-language',
                  },
                ],
                items: [],
              },
              removed: { aggregates: [], items: [] },
            },
            entrypoints: emptyLayerChanges(),
            'use-cases': emptyLayerChanges(),
          },
          name: 'orders',
        },
      ],
    })

    expect(report).toContain('##### Aggregate: `Order` (`domain-model`)')
    expect(report).toContain('##### Aggregate: `Order` (`published-language`)')
  })

  it('preserves backslashes before escaped table pipes', () => {
    const report = renderArchitectureReview({
      subdomains: [
        {
          layers: {
            domain: {
              added: {
                aggregates: [],
                items: [
                  {
                    name: String.raw`one\|pipe`,
                    packageKind: 'domain-model',
                    role: String.raw`many\\|pipes`,
                  },
                ],
              },
              removed: { aggregates: [], items: [] },
            },
            entrypoints: emptyLayerChanges(),
            'use-cases': emptyLayerChanges(),
          },
          name: 'orders',
        },
      ],
    })
    const escapedName = String.raw`one\\\|pipe`
    const escapedRole = String.raw`many\\\\\|pipes`

    expect(report).toContain(`| \`${escapedName}\` | \`${escapedRole}\` | \`domain-model\` |`)
  })
})

function emptyLayerChanges(): PullRequestArchitectureChanges['subdomains'][number]['layers']['domain'] {
  return {
    added: { aggregates: [], items: [] },
    removed: { aggregates: [], items: [] },
  }
}
