import { describe, expect, it } from 'vitest'
import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import { renderArchitectureCodeSpan } from './architecture-review-markdown'
import { formatPullRequestArchitectureDiff } from './pull-request-architecture-diff-formatter'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type Subdomain = Diff['subdomains'][number]
type Layer = Subdomain['layers']['domain']
type Item = Layer['added']['items'][number]

describe('pull request architecture diff formatter', () => {
  it('marks a new subdomain and groups entry points and use cases around their main item', () => {
    const entrypoint = { name: 'createSummaryCommand', role: 'cli-entrypoint' } as const
    const command = { name: 'RefreshSummary', role: 'command-use-case' } as const
    const query = { name: 'GenerateSummary', role: 'query-model-use-case' } as const
    const report = format(
      subdomain('living-documentation', 'added', {
        entrypoints: layer([
          item(entrypoint.name, entrypoint.role),
          item('SummaryDependencies', 'cli-entrypoint-dependencies'),
          item('formatSummary', 'cli-output-formatter', [entrypoint]),
          item('writeSummary', 'cli-response-writer', [entrypoint]),
        ]),
        useCases: layer([
          item(command.name, command.role),
          item('RefreshSummaryInput', 'command-use-case-input', [command]),
          item(query.name, query.role),
          item('GenerateSummaryInput', 'query-model-use-case-input', [query]),
          item('Summary', 'query-model', [query]),
          item('SummaryLoader', 'query-model-loader', [query]),
          item('GitModel', 'external-client-model', undefined, 'git'),
          item('CompilerModel', 'external-client-model', undefined, 'typescript'),
          item('readCompiler', 'external-client-service', undefined, 'typescript'),
          item('WorkspaceArchitectureSources', 'query-model'),
        ]),
      }),
    )

    expect(report).toBe(`<!-- pull-request-architecture-review -->
# Architecture changes

## Summary

| Subdomain | Status | Added | Removed |
| --- | --- | --- | --- |
| 🌍 **\`living-documentation\`** | 🆕 | 1 entry point · 1 command use case · 1 query use case · 1 query model · \`git\` external client with 1 component · \`typescript\` external client with 2 components | — |

---

<details open>
<summary><h2>🌍 living-documentation — 🆕</h2></summary>

### Entry points (1 added)

<details>
<summary>createSummaryCommand</summary>

| Role | Component |
| --- | --- |
| \`cli-output-formatter\` | \`formatSummary\` |
| \`cli-response-writer\` | \`writeSummary\` |

</details>

### Command use cases (1 added)

<details>
<summary>RefreshSummary</summary>

| Role | Component |
| --- | --- |
| \`command-use-case-input\` | \`RefreshSummaryInput\` |

</details>

### Query use cases (1 added)

<details>
<summary>GenerateSummary</summary>

| Role | Component |
| --- | --- |
| \`query-model-use-case-input\` | \`GenerateSummaryInput\` |
| \`query-model\` | \`Summary\` |
| \`query-model-loader\` | \`SummaryLoader\` |

</details>

### Query models (1 added)

- <span>WorkspaceArchitectureSources</span>

### External clients (2 added)

<details>
<summary>git — 1 component added</summary>

<details>
<summary>external-client-model — 1 added</summary>

- \`GitModel\`

</details>

</details>

<details>
<summary>typescript — 2 components added</summary>

<details>
<summary>external-client-model — 1 added</summary>

- \`CompilerModel\`

</details>

<details>
<summary>external-client-service — 1 added</summary>

- \`readCompiler\`

</details>

</details>

</details>
`)
    expect(report).not.toContain('SummaryDependencies')
  })

  it('renders removed primary, uncategorised, and domain changes safely', () => {
    const entrypoint = { name: 'oldCommand', role: 'cli-entrypoint' } as const
    const query = { name: 'OldQuery', role: 'query-model-use-case' } as const
    const domainItemLine = [
      '- <span>',
      String.raw`one\|pipe`,
      '</span> (',
      String.raw`many\\|pipes`,
      ')',
    ].join('')
    const report = format(
      subdomain('orders`[]()\n## forged', 'changed', {
        domain: layer(
          [],
          [
            {
              entities: [item('Line', 'aggregate-entity')],
              methods: ['cancel'],
              name: 'Order',
              packageKind: 'domain-model',
            },
            { entities: [], methods: [], name: 'Empty', packageKind: 'domain-model' },
          ],
          [item(String.raw`one\|pipe`, String.raw`many\\|pipes`)],
        ),
        entrypoints: layer([], [], [item(entrypoint.name, entrypoint.role)]),
        useCases: layer(
          [],
          [],
          [
            item('OldResult', 'unclassified-result', [query]),
            item('OldSupport', 'other-support\n## injected'),
            item('OldCompiler', 'external-client-service', undefined, 'typescript'),
          ],
        ),
      }),
    )

    expect({
      aggregate: report.includes('- <span>Order</span> (aggregate, `domain-model`)'),
      domainItemEscaping: report.includes(domainItemLine),
      emptyAggregate: report.includes('- <span>Empty</span> (aggregate, `domain-model`)'),
      entities: report.includes('    - Aggregate entities\n        - `Line`'),
      forgedHeading: report.includes('\n## forged'),
      methods: report.includes('    - Methods\n        - `cancel`'),
      removedExternalClient: report.includes(
        '<summary>typescript — 1 component removed</summary>\n\n<details>\n<summary>external-client-service — 1 removed</summary>\n\n- `OldCompiler`',
      ),
      query: report.includes('<summary>OldQuery</summary>'),
      querySection: report.includes('### Query use cases (1 removed)'),
      relatedComponent: report.includes('| `unclassified-result` | `OldResult` |'),
      roleHeading: report.includes('- <span>OldSupport</span> (other-support ## injected)'),
      safeHeading: report.includes('<summary><h2>🌍 orders`[]() ## forged</h2></summary>'),
      safeSummary: report.includes('| 🌍 **`` orders`[]() ## forged ``** | Changed'),
      uncategorisedSection: report.includes('### Uncategorised changes (1 removed)'),
    }).toStrictEqual({
      aggregate: true,
      domainItemEscaping: true,
      emptyAggregate: true,
      entities: true,
      forgedHeading: false,
      methods: true,
      removedExternalClient: true,
      query: true,
      querySection: true,
      relatedComponent: true,
      roleHeading: true,
      safeHeading: true,
      safeSummary: true,
      uncategorisedSection: true,
    })
  })

  it('distinguishes additions and removals within the same architecture sections', () => {
    const addedQuery = { name: 'NewQuery', role: 'query-model-use-case' } as const
    const removedQuery = { name: 'OldQuery', role: 'query-model-use-case' } as const
    const report = format(
      subdomain('orders', 'changed', {
        domain: layer(
          [item('NewOrderPolicy', 'domain-service')],
          [],
          [item('OldOrderPolicy', 'domain-service')],
        ),
        entrypoints: layer(
          [item('createNewCommand', 'cli-entrypoint')],
          [],
          [item('createOldCommand', 'cli-entrypoint')],
        ),
        useCases: layer(
          [
            item(addedQuery.name, addedQuery.role),
            item('NewQueryValue', 'query-model-value'),
            item('NewCompilerModel', 'external-client-model', undefined, 'typescript'),
            item('NewSupport', 'support-role'),
          ],
          [],
          [
            item(removedQuery.name, removedQuery.role),
            item('OldQueryValue', 'query-model-value'),
            item('OldCompilerModel', 'external-client-model', undefined, 'typescript'),
            item('OldSupport', 'support-role'),
          ],
        ),
      }),
    )

    expect({
      changedClient: report.includes('### External clients (1 changed)'),
      clientCounts: report.includes(
        '<summary>typescript — 1 component added, 1 component removed</summary>',
      ),
      domainHeadings: report.includes(
        '### Domain (1 added, 1 removed)\n\n#### Added\n\n- <span>NewOrderPolicy</span> (domain-service)\n\n#### Removed',
      ),
      externalClientHeadings: report.includes(
        '<summary>external-client-model — 1 added, 1 removed</summary>\n\n##### Added\n\n- `NewCompilerModel`\n\n##### Removed',
      ),
      primaryHeadings: report.includes(
        '### Entry points (1 added, 1 removed)\n\n#### Added\n\n- <span>createNewCommand</span>\n\n#### Removed',
      ),
      queryModelHeadings: report.includes(
        '### Query models (1 added, 1 removed)\n\n#### Added\n\n- <span>NewQueryValue</span> (query-model-value)\n\n#### Removed',
      ),
      summary: report.includes(
        '| 🌍 **`orders`** | Changed | 1 entry point · 1 query use case · 1 query model value · 1 domain item · 1 `typescript` external client component · 1 uncategorised change | 1 entry point · 1 query use case · 1 query model value · 1 domain item · 1 `typescript` external client component · 1 uncategorised change |',
      ),
      uncategorisedHeadings: report.includes(
        '### Uncategorised changes (1 added, 1 removed)\n\n#### Added\n\n- <span>NewSupport</span> (support-role)\n\n#### Removed',
      ),
      useCaseHeadings: report.includes(
        '### Query use cases (1 added, 1 removed)\n\n#### Added\n\n- <span>NewQuery</span>\n\n#### Removed',
      ),
    }).toStrictEqual({
      changedClient: true,
      clientCounts: true,
      domainHeadings: true,
      externalClientHeadings: true,
      primaryHeadings: true,
      queryModelHeadings: true,
      summary: true,
      uncategorisedHeadings: true,
      useCaseHeadings: true,
    })
  })

  it('returns the minimal comment when only hidden dependencies changed', () => {
    expect(
      format(
        subdomain('orders', 'changed', {
          entrypoints: layer([item('Dependencies', 'cli-entrypoint-dependencies')]),
        }),
      ),
    ).toBe(`<!-- pull-request-architecture-review -->
# Architecture changes

No architecture changes detected.
`)
  })

  it('omits empty entry point and role category sections from a visible subdomain', () => {
    const query = { name: 'ReadOrders', role: 'query-model-use-case' } as const
    const report = format(
      subdomain('orders', 'changed', {
        domain: layer(
          [],
          [],
          [],
          [{ entities: [], methods: [], name: 'Order', packageKind: 'domain-model' }],
        ),
        entrypoints: layer([item('Dependencies', 'cli-entrypoint-dependencies')]),
        useCases: layer([
          item(query.name, query.role),
          item('ReadOrdersResult', 'query-model', [query]),
        ]),
      }),
    )

    expect({
      domain: report.includes('## Domain'),
      entrypoints: report.includes('## Entry points'),
      externalClients: report.includes('## External clients'),
      queryModels: report.includes('## Query models'),
      uncategorised: report.includes('## Uncategorised changes'),
    }).toStrictEqual({
      domain: true,
      entrypoints: false,
      externalClients: false,
      queryModels: false,
      uncategorised: false,
    })
  })

  it('escapes code spans and table pipes', () => {
    expect(renderArchitectureCodeSpan('plain')).toBe('`plain`')
    expect(renderArchitectureCodeSpan('one`two')).toBe('`` one`two ``')
    expect(renderArchitectureCodeSpan(String.raw`one\|two`, true)).toBe(
      ['`', String.raw`one\\\|two`, '`'].join(''),
    )
  })
})

function format(...subdomains: readonly Subdomain[]): string {
  const diff = {
    changes: (): Diff => ({ subdomains }),
    outputPath: 'review.md',
  } satisfies Pick<PullRequestArchitectureDiff, 'changes' | 'outputPath'>
  return formatPullRequestArchitectureDiff(diff)
}

function subdomain(
  name: string,
  change: Subdomain['change'],
  layers: {
    readonly domain?: Layer
    readonly entrypoints?: Layer
    readonly useCases?: Layer
  },
): Subdomain {
  return {
    change,
    layers: {
      domain: layers.domain ?? layer(),
      entrypoints: layers.entrypoints ?? layer(),
      'use-cases': layers.useCases ?? layer(),
    },
    name,
  }
}

function layer(
  addedItems: readonly Item[] = [],
  removedAggregates: Layer['removed']['aggregates'] = [],
  removedItems: readonly Item[] = [],
  addedAggregates: Layer['added']['aggregates'] = [],
): Layer {
  return {
    added: { aggregates: addedAggregates, items: addedItems },
    removed: { aggregates: removedAggregates, items: removedItems },
  }
}

function item(
  name: string,
  role: string,
  relatedTo?: Item['relatedTo'],
  externalClient?: string,
): Item {
  return {
    ...(externalClient === undefined ? {} : { externalClient }),
    name,
    packageKind: role.startsWith('cli-') ? 'application' : 'use-cases',
    ...(relatedTo === undefined ? {} : { relatedTo }),
    role,
  }
}
