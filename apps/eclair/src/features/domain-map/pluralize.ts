export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`
}

export function pluralizeComponent(count: number): string {
  return pluralize(count, 'component', 'components')
}

export function pluralizeConnection(count: number): string {
  return pluralize(count, 'connection', 'connections')
}
