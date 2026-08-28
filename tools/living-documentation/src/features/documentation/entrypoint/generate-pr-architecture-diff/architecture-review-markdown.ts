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
export function renderArchitectureHtmlText(value: string): string {
  return value
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** @riviere-role cli-output-formatter */
export function renderArchitectureChangeCount(added: number, removed: number): string {
  return [
    ...(added === 0 ? [] : [`${added} added`]),
    ...(removed === 0 ? [] : [`${removed} removed`]),
  ].join(', ')
}

/** @riviere-role cli-output-formatter */
export function renderArchitectureChangedNounCount(
  added: number,
  removed: number,
  singular: string,
): string {
  return [
    ...(added === 0 ? [] : [`${added} ${plural(added, singular)} added`]),
    ...(removed === 0 ? [] : [`${removed} ${plural(removed, singular)} removed`]),
  ].join(', ')
}

/** @riviere-role cli-output-formatter */
export function compareArchitectureText(left: string, right: string): number {
  return left.localeCompare(right, 'en')
}

function longestBacktickRun(value: string): number {
  return Math.max(0, ...[...value.matchAll(/`+/g)].map((match) => match[0].length))
}

function plural(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`
}
