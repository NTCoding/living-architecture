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

type RequiredLineLocation = SourceLocation & { lineNumber: number }

export function detectPublishConnections(
  project: Project,
  components: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
): ExtractedLink[] {
  const publishers = components.filter((c) => c.type === 'eventPublisher')
  const events = components.filter((c) => c.type === 'event')
  const repository = options.repository

  return publishers.flatMap((publisher) =>
    extractPublisherLinks(project, publisher, events, options, repository),
  )
}

function extractPublisherLinks(
  project: Project,
  publisher: EnrichedComponent,
  events: readonly EnrichedComponent[],
  options: AsyncDetectionOptions,
  repository: string,
): ExtractedLink[] {
  const publishedEventType = publisher.metadata['publishedEventType']
  if (typeof publishedEventType === 'string') {
    const sourceLocation: RequiredLineLocation = {
      repository,
      filePath: publisher.location.file,
      lineNumber: publisher.location.line,
    }
    return resolvePublishTarget(publisher, publishedEventType, events, options, sourceLocation)
  }

  const classDecl = findClassInProject(project, publisher)
  if (classDecl === undefined) {
    return []
  }

  const methods = classDecl.getMethods()
  return methods.flatMap((method) => {
    const firstParam = method.getParameters()[0]
    if (firstParam === undefined) {
      return []
    }

    const paramType = firstParam.getType()
    const paramTypeName = stripGenericArgs(paramType.getText(firstParam))

    const sourceLocation: RequiredLineLocation = {
      repository,
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
  sourceLocation: RequiredLineLocation,
): ExtractedLink[] {
  const matchingEvents = events.filter((e) => e.metadata['eventName'] === paramTypeName)

  if (matchingEvents.length === 0) {
    return [handleNoMatch(publisher, paramTypeName, options, sourceLocation)]
  }

  if (matchingEvents.length > 1) {
    return [
      handleAmbiguousMatch(
        publisher,
        paramTypeName,
        matchingEvents.length,
        options,
        sourceLocation,
      ),
    ]
  }

  return matchingEvents.map((event) => ({
    source: componentIdentity(publisher),
    target: componentIdentity(event),
    type: 'async' as const,
    sourceLocation,
  }))
}

function handleAmbiguousMatch(
  publisher: EnrichedComponent,
  paramTypeName: string,
  matchCount: number,
  options: AsyncDetectionOptions,
  sourceLocation: RequiredLineLocation,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: sourceLocation.filePath,
      line: sourceLocation.lineNumber,
      typeName: publisher.name,
      reason: `parameter type "${paramTypeName}" matches ${matchCount} Event components (ambiguous)`,
    })
  }
  return {
    source: componentIdentity(publisher),
    target: '_unresolved',
    type: 'async',
    sourceLocation,
    _uncertain: `ambiguous: ${matchCount} events match parameter type: ${paramTypeName}`,
  }
}

function handleNoMatch(
  publisher: EnrichedComponent,
  paramTypeName: string,
  options: AsyncDetectionOptions,
  sourceLocation: RequiredLineLocation,
): ExtractedLink {
  if (options.strict) {
    throw new ConnectionDetectionError({
      file: sourceLocation.filePath,
      line: sourceLocation.lineNumber,
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
