import type {
  AiExtractConfig,
  AiExtractionGap,
} from '@living-architecture/riviere-extract-config-published-language'
import type { Component } from '@living-architecture/riviere-schema-published-language/schema'
import type { AiExtractSourceFile } from '../ports/read-ai-extract-source-files'
import type { WorkflowDiagnostic } from '../workflow-diagnostic'
import type { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { AiExtractCandidateId } from './ai-extract-candidate-id'

type AiExtractCallSiteCandidate = Readonly<{
  category: 'missing-event-handlers' | 'missing-events' | 'missing-use-cases'
  componentId: string
  evidence: string
  filePath: string
  line: number
}>

type AiExtractUncertainLinkCandidate = Readonly<{
  category: 'uncertain-links'
  source: string
  target: string
  evidence: string
}>

type AiExtractGapCandidate = AiExtractCallSiteCandidate | AiExtractUncertainLinkCandidate

type AiExtractLinkOccurrence = Readonly<{ source: string; target: string }>

type AiExtractGaps = Readonly<{
  existingComponentIds: readonly string[]
  existingLinks: readonly AiExtractLinkOccurrence[]
  candidates: readonly AiExtractGapCandidate[]
}>

type ComputeAiExtractGapsInput = Readonly<{
  config: AiExtractConfig
  components: readonly Component[]
  links: readonly AiExtractLinkOccurrence[]
  unresolvedDiagnostics: readonly WorkflowDiagnostic[]
  files: readonly AiExtractSourceFile[]
  builder?: RiviereBuilder
}>

type GapComputationState = Readonly<{
  existingComponentIds: readonly string[]
  components: readonly Component[]
  links: readonly AiExtractLinkOccurrence[]
  unresolvedDiagnostics: readonly WorkflowDiagnostic[]
  files: readonly AiExtractSourceFile[]
  builder?: RiviereBuilder
}>

type CallSiteLocation = Readonly<{ domain: string; module: string }>

type CallSite = Readonly<{
  category: AiExtractCallSiteCandidate['category']
  name: string
  filePath: string
  evidence: string
  line: number
}>

const EVENT_CALL_PATTERN =
  /\b(?:publish|publishEvent|emit|dispatch)\(\s*['"`]([A-Za-z][\w.:-]*)['"`]/
const HANDLER_CALL_PATTERN = /\b(?:subscribe|on|handle|listen)\(\s*['"`]([A-Za-z][\w.:-]*)['"`]/
const USE_CASE_PATTERN = /\b(?:useCase|runUseCase|executeUseCase)\(\s*new\s+([A-Z]\w*)/

/**
 * @riviere-role domain-service
 * @riviere-role-justification Derives AI extraction gap candidates from supplied components, links, diagnostics, config, and source files; pure transformation with no I/O or retained state.
 */
export function computeAiExtractGaps(input: ComputeAiExtractGapsInput): AiExtractGaps {
  const state: GapComputationState = {
    existingComponentIds: input.components.map((component) => component.id),
    components: input.components,
    links: input.links.map((link) => ({ source: link.source, target: link.target })),
    unresolvedDiagnostics: input.unresolvedDiagnostics,
    files: input.files,
    ...(input.builder === undefined ? {} : { builder: input.builder }),
  }
  const candidates = input.config.selection.from.flatMap((category) =>
    candidatesForCategory(category, state),
  )
  return {
    existingComponentIds: state.existingComponentIds,
    existingLinks: state.links,
    candidates,
  }
}

function candidatesForCategory(
  category: AiExtractionGap,
  state: GapComputationState,
): readonly AiExtractGapCandidate[] {
  switch (category) {
    case 'uncertain-links':
      return uncertainLinkCandidates(state.unresolvedDiagnostics)
    case 'missing-events':
      return eventCandidates(state)
    case 'missing-event-handlers':
      return eventHandlerCandidates(state)
    case 'missing-use-cases':
      return useCaseCandidates(state)
  }
}

function uncertainLinkCandidates(
  diagnostics: readonly WorkflowDiagnostic[],
): readonly AiExtractUncertainLinkCandidate[] {
  return diagnostics.flatMap((diagnostic) => {
    const value = diagnostic.value
    if (value.kind !== 'uncertain-link') return []
    return [
      {
        category: 'uncertain-links' as const,
        source: value.source,
        target: value.target,
        evidence: diagnostic.describe(),
      },
    ]
  })
}

function eventCandidates(state: GapComputationState): readonly AiExtractCallSiteCandidate[] {
  return callSiteCandidates('missing-events', EVENT_CALL_PATTERN, state).flatMap((callSite) => {
    const location = domainAndModule(callSite.filePath)
    if (location === undefined) return []
    if (state.builder !== undefined && !state.builder.hasDomain(location.domain)) return []
    const componentId = AiExtractCandidateId.fromParts({
      ...location,
      type: 'Event',
      name: callSite.name,
    }).toString()
    if (state.existingComponentIds.includes(componentId)) return []
    return [{ ...callSite, componentId }]
  })
}

function useCaseCandidates(state: GapComputationState): readonly AiExtractCallSiteCandidate[] {
  return callSiteCandidates('missing-use-cases', USE_CASE_PATTERN, state).flatMap((callSite) => {
    const location = domainAndModule(callSite.filePath)
    if (location === undefined) return []
    if (state.builder !== undefined && !state.builder.hasDomain(location.domain)) return []
    const componentId = AiExtractCandidateId.fromParts({
      ...location,
      type: 'UseCase',
      name: callSite.name,
    }).toString()
    if (state.existingComponentIds.includes(componentId)) return []
    return [{ ...callSite, componentId }]
  })
}

function eventHandlerCandidates(state: GapComputationState): readonly AiExtractCallSiteCandidate[] {
  const eventHandlerIds = new Set(
    state.components
      .filter((component) => component.type === 'EventHandler')
      .map((component) => component.id),
  )
  const unmatchedEvents = state.components
    .filter(isEventComponent)
    .filter(
      (component) =>
        !state.links.some(
          (link) => link.source === component.id && eventHandlerIds.has(link.target),
        ),
    )
  const callSites = callSiteCandidates('missing-event-handlers', HANDLER_CALL_PATTERN, state)
  return unmatchedEvents.flatMap((event) => handlerCandidatesForEvent(event, callSites, state))
}

function handlerCandidatesForEvent(
  event: Extract<Component, Readonly<{ type: 'Event' }>>,
  callSites: readonly CallSite[],
  state: GapComputationState,
): readonly AiExtractCallSiteCandidate[] {
  const handlerName = `${event.name}Handler`
  return callSites.flatMap((callSite) => {
    if (!matchesEventName(callSite.name, event.eventName)) return []
    const location = domainAndModule(callSite.filePath)
    if (location === undefined) return []
    if (state.builder !== undefined && !state.builder.hasDomain(location.domain)) return []
    const componentId = AiExtractCandidateId.fromParts({
      ...location,
      type: 'EventHandler',
      name: handlerName,
    }).toString()
    if (state.existingComponentIds.includes(componentId)) return []
    return [{ ...callSite, componentId }]
  })
}

function matchesEventName(callSiteName: string, eventName: string): boolean {
  return normalizeName(callSiteName) === normalizeName(eventName)
}

function normalizeName(value: string): string {
  return value.replaceAll(/[^A-Za-z0-9]/g, '').toLowerCase()
}

function callSiteCandidates(
  category: AiExtractCallSiteCandidate['category'],
  pattern: RegExp,
  state: GapComputationState,
): readonly CallSite[] {
  return state.files.flatMap((file) =>
    file.content.split(/\r?\n/).flatMap((text, index) => {
      const match = pattern.exec(text)
      const name = match?.[1]
      if (name === undefined) return []
      return [
        {
          category,
          name,
          filePath: file.filePath,
          evidence: text.trim(),
          line: index + 1,
        },
      ]
    }),
  )
}

function domainAndModule(filePath: string): CallSiteLocation | undefined {
  const segments = filePath.split('/').filter((segment) => segment.length > 0)
  const sourceIndex = segments.lastIndexOf('src')
  const directorySegments =
    sourceIndex === -1 ? segments.slice(0, -1) : segments.slice(sourceIndex + 1, -1)
  const domain = directorySegments[0]
  if (domain === undefined) return undefined
  const module = directorySegments[1] ?? domain
  return { domain, module }
}

export type {
  AiExtractCallSiteCandidate,
  AiExtractGapCandidate,
  AiExtractGaps,
  AiExtractLinkOccurrence,
  AiExtractUncertainLinkCandidate,
  ComputeAiExtractGapsInput,
}

function isEventComponent(
  component: Component,
): component is Extract<Component, Readonly<{ type: 'Event' }>> {
  return component.type === 'Event'
}
