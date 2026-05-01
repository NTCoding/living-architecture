import { ExtractedLink } from '../extracted-link'
import type {
  RawLink, UncertainRawLink, CallSite 
} from './call-graph-types'
import { componentIdentity } from './component-identity'

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
  const link = new ExtractedLink({
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
  return new ExtractedLink({
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
    const sourceId = componentIdentity(raw.source)
    const targetId = componentIdentity(raw.target)
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
        componentIdentity(uncertain.source),
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
