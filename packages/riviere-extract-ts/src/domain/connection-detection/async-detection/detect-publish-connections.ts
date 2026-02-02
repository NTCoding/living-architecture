import type { Project } from 'ts-morph'
import type { SourceLocation } from '@living-architecture/riviere-schema'
import type { EnrichedComponent } from '../../value-extraction/enrich-components'
import type { ExtractedLink } from '../extracted-link'
import { ConnectionDetectionError } from '../connection-detection-error'
import {
  componentIdentity, stripGenericArgs 
} from '../call-graph/call-graph-types'
import { findClassInProject } from '../call-graph/trace-calls'
import type { AsyncDetectionOptions } from './detect-subscribe-connections'

export function detectPublishConnections(
  project: Project,
  components: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
): ExtractedLink[] {
  const publishers = components.filter((c) => c.type === 'eventPublisher')
  const events = components.filter((c) => c.type === 'event')

  return publishers.flatMap((publisher) =>
    extractPublisherLinks(project, publisher, events, options),
  )
}

function extractPublisherLinks(
  project: Project,
  publisher: EnrichedComponent,
  events: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
): ExtractedLink[] {
  const classDecl = findClassInProject(project, publisher)
  if (classDecl === undefined) {
    return []
  }

  const methods = classDecl.getMethods()
  return methods.flatMap((method) => {
    const params = method.getParameters()
    if (params.length === 0) {
      return []
    }

    const firstParam = params[0]
    /* v8 ignore next -- @preserve defensive: length already checked above */
    if (firstParam === undefined) {
      return []
    }
    const paramType = firstParam.getType()
    const paramTypeName = stripGenericArgs(paramType.getText(firstParam))

    const sourceLocation: SourceLocation = {
      repository: '',
      filePath: publisher.location.file,
      lineNumber: method.getStartLineNumber(),
    }

    return resolvePublishTarget(publisher, paramTypeName, events, options, sourceLocation)
  })
}

function resolvePublishTarget(
  publisher: EnrichedComponent,
  paramTypeName: string,
  events: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
  sourceLocation: SourceLocation,
): ExtractedLink[] {
  const matchingEvents = events.filter((e) => e.metadata['eventName'] === paramTypeName)

  if (matchingEvents.length === 0) {
    return [handleNoMatch(publisher, paramTypeName, options, sourceLocation)]
  }

  return matchingEvents.map((event) => ({
    source: componentIdentity(publisher),
    target: componentIdentity(event),
    type: 'async' as const,
    sourceLocation,
  }))
}

function handleNoMatch(
  publisher: EnrichedComponent,
  paramTypeName: string,
  options: AsyncDetectionOptions,
  sourceLocation: SourceLocation,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: sourceLocation.filePath,
      /* v8 ignore next -- @preserve lineNumber always set by extractPublisherLinks */
      line: sourceLocation.lineNumber ?? 0,
      typeName: publisher.name,
      reason: `parameter type "${paramTypeName}" does not match any Event component`,
    })
  }
  return {
    source: componentIdentity(publisher),
    target: '_unresolved',
    type: 'async',
    sourceLocation,
    _uncertain: `no event found for parameter type: ${paramTypeName}`,
  }
}
