import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import {
  renderArchitectureCodeSpan,
  renderArchitectureHtmlText,
} from './architecture-review-markdown'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type LayerChanges = Diff['subdomains'][number]['layers']['entrypoints']
type ArchitectureItem = LayerChanges['added']['items'][number]
type Relationship = NonNullable<ArchitectureItem['relatedTo']>[number]

/** @riviere-role cli-output-formatter */
export function renderArchitecturePrimary(
  primary: Relationship,
  items: readonly ArchitectureItem[],
): readonly string[] {
  const components = items.filter((item) =>
    (item.relatedTo ?? []).some(
      (relationship) => relationshipKey(relationship) === relationshipKey(primary),
    ),
  )
  if (components.length === 0) {
    return [`- <span>${renderArchitectureHtmlText(primary.name)}</span>`, '']
  }
  return [
    '<details>',
    `<summary>${renderArchitectureHtmlText(primary.name)}</summary>`,
    '',
    '| Role | Component |',
    '| --- | --- |',
    ...components.map(
      (component) => `| ${tableCode(component.role)} | ${tableCode(component.name)} |`,
    ),
    '',
    '</details>',
    '',
  ]
}

function relationshipKey(relationship: Relationship): string {
  return `${relationship.role}:${relationship.name}`
}

function tableCode(value: string): string {
  return renderArchitectureCodeSpan(value, true)
}
