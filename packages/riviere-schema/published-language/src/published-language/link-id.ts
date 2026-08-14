import type { SourceLocation } from './schema'

/** @riviere-role value-object */
export class LinkId {
  declare private readonly brand: 'LinkId'

  private constructor(private readonly value: string) {}

  static parseFromLink(link: {
    source: string
    target: string
    sourceLocation?: SourceLocation
  }): LinkId {
    const source = escapePercent(link.source).replaceAll('->', '%2D%3E')
    const target = escapePercent(link.target).replaceAll('@', '%40')
    const baseId = `${source}->${target}`
    const sourceLocation = link.sourceLocation
    if (sourceLocation === undefined) return new LinkId(baseId)

    const filePath = escapePercent(sourceLocation.filePath).replaceAll(':', '%3A')
    const line = sourceLocation.lineNumber
    const column = sourceLocation.columnNumber
    if (line === undefined) {
      const value =
        column === undefined ? `${baseId}@${filePath}` : `${baseId}@${filePath}::${column}`
      return new LinkId(value)
    }

    const value =
      column === undefined
        ? `${baseId}@${filePath}:${line}`
        : `${baseId}@${filePath}:${line}:${column}`
    return new LinkId(value)
  }

  toString(): string {
    return this.value
  }
}

function escapePercent(value: string): string {
  return value.replaceAll('%', '%25')
}
