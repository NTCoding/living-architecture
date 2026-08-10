import type { SourceLocation } from './schema'

export interface LinkIdentity {
  source: string
  target: string
  sourceLocation?: SourceLocation
}

export function createLinkId(link: LinkIdentity): string {
  const source = escapePercent(link.source).replaceAll('->', '%2D%3E')
  const target = escapePercent(link.target).replaceAll('@', '%40')
  const baseId = `${source}->${target}`
  const sourceLocation = link.sourceLocation
  if (sourceLocation === undefined) {
    return baseId
  }

  const filePath = escapePercent(sourceLocation.filePath).replaceAll(':', '%3A')
  const line = sourceLocation.lineNumber
  const column = sourceLocation.columnNumber
  if (line === undefined) {
    return column === undefined ? `${baseId}@${filePath}` : `${baseId}@${filePath}::${column}`
  }

  return column === undefined
    ? `${baseId}@${filePath}:${line}`
    : `${baseId}@${filePath}:${line}:${column}`
}

function escapePercent(value: string): string {
  return value.replaceAll('%', '%25')
}
