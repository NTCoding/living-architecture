import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import { renderArchitectureHtmlText } from './architecture-review-markdown'
import {
  hasVisibleEntrypointChanges,
  renderArchitectureEntrypoints,
  renderArchitectureUseCaseCategory,
} from './architecture-review-primary-sections'
import {
  hasArchitectureLayerChanges,
  renderArchitectureDomain,
} from './architecture-review-domain-section'
import {
  renderArchitectureQueryModels,
  renderUncategorisedArchitectureChanges,
} from './architecture-review-role-sections'
import { renderArchitectureExternalClients } from './architecture-review-external-client-section'
import { renderArchitectureSummary } from './architecture-review-summary'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type PullRequestArchitectureDiffView = Pick<PullRequestArchitectureDiff, 'changes' | 'outputPath'>
type SubdomainChanges = Diff['subdomains'][number]

const COMMENT_MARKER = '<!-- pull-request-architecture-review -->'

/** @riviere-role cli-output-formatter */
export function formatPullRequestArchitectureDiff(diff: PullRequestArchitectureDiffView): string {
  const subdomains = diff.changes().subdomains.filter(hasVisibleSubdomainChanges)
  if (subdomains.length === 0) return renderNoArchitectureChanges()
  return [
    COMMENT_MARKER,
    '# Architecture changes',
    '',
    ...renderArchitectureSummary(subdomains),
    ...subdomains.flatMap(renderSubdomain),
  ].join('\n')
}

function renderNoArchitectureChanges(): string {
  return [
    COMMENT_MARKER,
    '# Architecture changes',
    '',
    'No architecture changes detected.',
    '',
  ].join('\n')
}

function renderSubdomain(subdomain: SubdomainChanges): readonly string[] {
  const status = subdomain.change === 'added' ? ' — 🆕' : ''
  return [
    '---',
    '',
    '<details open>',
    `<summary><h2>🌍 ${renderArchitectureHtmlText(subdomain.name)}${status}</h2></summary>`,
    '',
    ...renderArchitectureEntrypoints(subdomain.layers.entrypoints),
    ...renderArchitectureUseCaseCategory(
      'Command use cases',
      'command-use-case',
      subdomain.layers['use-cases'],
    ),
    ...renderArchitectureUseCaseCategory(
      'Query use cases',
      'query-model-use-case',
      subdomain.layers['use-cases'],
    ),
    ...renderArchitectureQueryModels(subdomain.layers['use-cases']),
    ...renderArchitectureDomain(subdomain.layers.domain),
    ...renderArchitectureExternalClients(subdomain.layers['use-cases']),
    ...renderUncategorisedArchitectureChanges(subdomain.layers['use-cases']),
    '</details>',
    '',
  ]
}

function hasVisibleSubdomainChanges(subdomain: SubdomainChanges): boolean {
  return (
    hasVisibleEntrypointChanges(subdomain.layers.entrypoints) ||
    hasArchitectureLayerChanges(subdomain.layers['use-cases']) ||
    hasArchitectureLayerChanges(subdomain.layers.domain)
  )
}
