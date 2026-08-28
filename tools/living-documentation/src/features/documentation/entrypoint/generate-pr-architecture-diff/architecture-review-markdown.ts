/** @riviere-role cli-output-formatter */
export function renderArchitectureCodeSpan(value: string, escapePipes = false): string {
  const normalized = value.replaceAll('\r', ' ').replaceAll('\n', ' ')
  const singleLine = escapePipes
    ? normalized.replaceAll('\\', '\\\\').replaceAll('|', '\\|')
    : normalized
  const delimiter = '`'.repeat(longestBacktickRun(singleLine) + 1)
  const padding = singleLine.includes('`') ? ' ' : ''
  return `${delimiter}${padding}${singleLine}${padding}${delimiter}`
}

/** @riviere-role cli-output-formatter */
export function compareArchitectureText(left: string, right: string): number {
  return left.localeCompare(right, 'en')
}

function longestBacktickRun(value: string): number {
  return Math.max(0, ...[...value.matchAll(/`+/g)].map((match) => match[0].length))
}
