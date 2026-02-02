interface ComponentSummary {
  readonly type: string
  readonly name: string
  readonly domain: string
}

export interface CategorizedComponents {
  readonly added: readonly ComponentSummary[]
  readonly modified: readonly ComponentSummary[]
  readonly removed: readonly ComponentSummary[]
}

function formatComponentLine(component: ComponentSummary): string {
  return `- **${component.type}** \`${component.name}\` in \`${component.domain}\` domain`
}

function formatSection(title: string, components: readonly ComponentSummary[]): string {
  const header = `### ${title} (${components.length})`
  if (components.length === 0) {
    return `${header}\nNone`
  }
  return `${header}\n${components.map(formatComponentLine).join('\n')}`
}

export function formatPrMarkdown(categorized: CategorizedComponents): string {
  const sections = [
    formatSection('Added Components', categorized.added),
    formatSection('Modified Components', categorized.modified),
    formatSection('Removed Components', categorized.removed),
  ]

  return `## Architecture Changes\n\n${sections.join('\n\n')}`
}
