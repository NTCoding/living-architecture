import type { SourceLocation } from './schema'

export interface LinkIdentity {
  source: string
  target: string
  sourceLocation?: SourceLocation
}

export function createLinkId(link: LinkIdentity): string {
  const baseId = `${link.source}->${link.target}`
  const sourceLocation = link.sourceLocation
  if (sourceLocation === undefined) {
    return baseId
  }

  const line = sourceLocation.lineNumber
  const column = sourceLocation.columnNumber
  if (line === undefined) {
    return column === undefined
      ? `${baseId}@${sourceLocation.filePath}`
      : `${baseId}@${sourceLocation.filePath}::${column}`
  }

  return column === undefined
    ? `${baseId}@${sourceLocation.filePath}:${line}`
    : `${baseId}@${sourceLocation.filePath}:${line}:${column}`
}
