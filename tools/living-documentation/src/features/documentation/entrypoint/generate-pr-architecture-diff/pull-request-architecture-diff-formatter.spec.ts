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
# Pull request architecture changes

## Changed subdomains

- [\`living-documentation\`](#subdomain-living-documentation) **NEW**

## Subdomain: \`living-documentation\`

### Entry points

#### Added

##### \`createSummaryCommand\`

- Role: \`cli-entrypoint\`
- Output formatter: \`formatSummary\` (\`cli-output-formatter\`)
- Response writer: \`writeSummary\` (\`cli-response-writer\`)

### Command use cases

#### Added

##### \`RefreshSummary\`

- Role: \`command-use-case\`
- Input: \`RefreshSummaryInput\` (\`command-use-case-input\`)

### Query use cases

#### Added

##### \`GenerateSummary\`

- Role: \`query-model-use-case\`
- Input: \`GenerateSummaryInput\` (\`query-model-use-case-input\`)
- Output model: \`Summary\` (\`query-model\`)
- Loader: \`SummaryLoader\` (\`query-model-loader\`)

### External clients

#### Client: \`git\`

##### Added

###### External Client Model

- \`GitModel\`

#### Client: \`typescript\`

##### Added

###### External Client Model

- \`CompilerModel\`

###### External Client Service

- \`readCompiler\`

### Query models

#### Added

##### Query Model

- \`WorkspaceArchitectureSources\`
`)
    expect(report).not.toContain('SummaryDependencies')
  })

  it('renders removed primary, uncategorised, and domain changes safely', () => {
    const entrypoint = { name: 'oldCommand', role: 'cli-entrypoint' } as const
    const query = { name: 'OldQuery', role: 'query-model-use-case' } as const
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
            item('OldSupport', 'other-support'),
            item('OldCompiler', 'external-client-service', undefined, 'typescript'),
          ],
        ),
      }),
    )

    expect({
      aggregate: report.includes('##### Aggregate: `Order` (`domain-model`)'),
      emptyAggregate: report.includes('##### Aggregate: `Empty` (`domain-model`)'),
      entities: report.includes('- Aggregate entities\n    - `Line`'),
      forgedHeading: report.includes('\n## forged'),
      methods: report.includes('- Methods\n    - `cancel`'),
      removedExternalClient: report.includes(
        '#### Client: `typescript`\n\n##### Removed\n\n###### External Client Service\n\n- `OldCompiler`',
      ),
      query: report.includes('##### `OldQuery`'),
      querySection: report.includes('### Query use cases\n\n#### Removed'),
      relatedComponent: report.includes('- Related component: `OldResult` (`unclassified-result`)'),
      safeHeading: report.includes('## Subdomain: `` orders`[]() ## forged ``'),
      safeSummary: report.includes('- `` orders`[]() ## forged ``'),
      uncategorisedSection: report.includes('### Uncategorised changes\n\n#### Removed'),
      tableEscaping: report.includes(
        [
          '| `',
          String.raw`one\\\|pipe`,
          '` | `',
          String.raw`many\\\\\|pipes`,
          '` | `use-cases` |',
        ].join(''),
      ),
    }).toStrictEqual({
      aggregate: true,
      emptyAggregate: true,
      entities: true,
      forgedHeading: false,
      methods: true,
      removedExternalClient: true,
      query: true,
      querySection: true,
      relatedComponent: true,
      safeHeading: true,
      safeSummary: true,
      uncategorisedSection: true,
      tableEscaping: true,
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
# Pull request architecture changes

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
      domain: report.includes('### Domain'),
      entrypoints: report.includes('### Entry points'),
      externalClients: report.includes('### External clients'),
      queryModels: report.includes('### Query models'),
      uncategorised: report.includes('### Uncategorised changes'),
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
