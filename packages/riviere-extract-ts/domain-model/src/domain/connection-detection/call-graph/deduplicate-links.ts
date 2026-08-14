import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import { ExtractedLink } from '../extracted-link'
import type { CallSite, RawLink, UncertainRawLink } from './call-graph-types'

interface RequiredSourceLocation {
  repository: string
  filePath: string
  lineNumber: number
  methodName: string
}

class MissingSourceLocationError extends Error {
  constructor() {
    super('Expected sourceLocation on extracted link')
    this.name = 'MissingSourceLocationError'
  }
}

function linkKey(source: string, target: string, type: string): string {
  return `${source}|${target}|${type}`
}

function buildExtractedLink(
  source: string,
  target: string,
  type: 'sync' | 'async',
  callSite: CallSite,
  repository: string,
): ExtractedLink {
  const link = ExtractedLink.parse({
    source,
    target,
    type,
    sourceLocation: {
      repository,
      filePath: callSite.filePath,
      lineNumber: callSite.lineNumber,
      methodName: callSite.methodName,
    },
  })

  const sourceLocation = link.sourceLocation
  if (sourceLocation === undefined) {
    throw new MissingSourceLocationError()
  }

  return link
}

function buildUncertainLink(
  source: string,
  reason: string,
  callSite: CallSite,
  repository: string,
): ExtractedLink {
  return ExtractedLink.parse({
    source,
    target: '_unresolved',
    type: 'sync',
    _uncertain: reason,
    sourceLocation: {
      repository,
      filePath: callSite.filePath,
      lineNumber: callSite.lineNumber,
      methodName: callSite.methodName,
    },
  })
}

/** @riviere-role domain-service */
export function deduplicateLinks(
  rawLinks: RawLink[],
  uncertainLinks: UncertainRawLink[],
  repository = '',
): ExtractedLink[] {
  const seen = new Map<string, ExtractedLink>()

  for (const raw of rawLinks) {
    const sourceId = ComponentId.parseFromParts(raw.source).toString()
    const targetId = ComponentId.parseFromParts(raw.target).toString()
    const type = 'sync'
    const key = linkKey(sourceId, targetId, type)

    const existing = seen.get(key)
    if (existing !== undefined) {
      if (raw.callSite.lineNumber < requireSourceLocation(existing).lineNumber) {
        seen.set(key, buildExtractedLink(sourceId, targetId, type, raw.callSite, repository))
      }
      continue
    }

    seen.set(key, buildExtractedLink(sourceId, targetId, type, raw.callSite, repository))
  }

  const result: ExtractedLink[] = [...seen.values()]

  for (const uncertain of uncertainLinks) {
    result.push(
      buildUncertainLink(
        ComponentId.parseFromParts(uncertain.source).toString(),
        uncertain.reason,
        uncertain.callSite,
        repository,
      ),
    )
  }

  return result
}

function requireSourceLocation(link: ExtractedLink): RequiredSourceLocation {
  const sourceLocation = link.sourceLocation
  if (sourceLocation === undefined) {
    throw new MissingSourceLocationError()
  }

  if (sourceLocation.lineNumber === undefined) {
    throw new MissingSourceLocationError()
  }

  if (sourceLocation.methodName === undefined) {
    throw new MissingSourceLocationError()
  }

  return {
    repository: sourceLocation.repository,
    filePath: sourceLocation.filePath,
    lineNumber: sourceLocation.lineNumber,
    methodName: sourceLocation.methodName,
  }
}
