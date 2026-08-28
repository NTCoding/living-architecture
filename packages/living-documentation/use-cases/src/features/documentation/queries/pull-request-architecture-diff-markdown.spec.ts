import { describe, expect, it } from 'vitest'
import {
  ArchitectureDiff,
  ArchitectureSource,
  extractArchitecture,
} from '@living-architecture/living-documentation-domain-model/domain/architecture'
import { PullRequestArchitectureDiff } from './pull-request-architecture-diff'

describe('pull request architecture diff Markdown', () => {
  it('renders non-table names without allowing Markdown structure injection', () => {
    const name = 'orders`[]()\n## forged'
    const report = renderDiff(
      ArchitectureSource.from({ subdomains: [] }),
      ArchitectureSource.from({
        subdomains: [
          {
            layers: {
              domain: emptyLayer(),
              entrypoints: {
                aggregates: [],
                items: [{ name: 'run', packageKind: 'application', role: 'cli-entrypoint' }],
              },
              'use-cases': emptyLayer(),
            },
            name,
          },
        ],
      }),
    )

    expect(report).toContain('- `` orders`[]() ## forged ``')
    expect(report).toContain('## Subdomain: `` orders`[]() ## forged ``')
    expect(report).not.toContain('\n## forged')
  })

  it('distinguishes same-named aggregates by package kind', () => {
    const report = renderDiff(
      ArchitectureSource.from({ subdomains: [] }),
      ArchitectureSource.from({
        subdomains: [
          {
            layers: {
              domain: {
                aggregates: [
                  { entities: [], methods: [], name: 'Order', packageKind: 'domain-model' },
                  { entities: [], methods: [], name: 'Order', packageKind: 'published-language' },
                ],
                items: [],
              },
              entrypoints: emptyLayer(),
              'use-cases': emptyLayer(),
            },
            name: 'orders',
          },
        ],
      }),
    )

    expect(report).toContain('##### Aggregate: `Order` (`domain-model`)')
    expect(report).toContain('##### Aggregate: `Order` (`published-language`)')
  })

  it('preserves backslashes before escaped table pipes', () => {
    const report = renderDiff(
      ArchitectureSource.from({ subdomains: [] }),
      ArchitectureSource.from({
        subdomains: [
          {
            layers: {
              domain: {
                aggregates: [],
                items: [
                  {
                    name: String.raw`one\|pipe`,
                    packageKind: 'domain-model',
                    role: String.raw`many\\|pipes`,
                  },
                ],
              },
              entrypoints: emptyLayer(),
              'use-cases': emptyLayer(),
            },
            name: 'orders',
          },
        ],
      }),
    )
    const escapedName = String.raw`one\\\|pipe`
    const escapedRole = String.raw`many\\\\\|pipes`

    expect(report).toContain(`| \`${escapedName}\` | \`${escapedRole}\` | \`domain-model\` |`)
  })
})

function emptyLayer() {
  return { aggregates: [], items: [] }
}

function renderDiff(base: ArchitectureSource, head: ArchitectureSource): string {
  return PullRequestArchitectureDiff.fromArchitectureDiff(
    ArchitectureDiff.fromArchitectures(extractArchitecture(base), extractArchitecture(head)),
    'output.md',
  ).markdown
}
