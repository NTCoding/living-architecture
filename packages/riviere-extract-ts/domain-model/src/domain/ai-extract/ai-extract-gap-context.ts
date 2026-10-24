import type { Component, Link } from '@living-architecture/riviere-schema-published-language/schema'
import type { WorkflowDiagnostic } from '../workflow-diagnostic'

type AiExtractUncertainLink = Readonly<{
  source: string
  target: string
}>

type AiExtractExistingLink = Readonly<{
  source: string
  target: string
}>

type AiExtractEventWithoutHandler = Readonly<{
  componentId: string
  eventName: string | undefined
}>

type EventComponent = Extract<Component, Readonly<{ type: 'Event' }>>
type UseCaseComponent = Extract<Component, Readonly<{ type: 'UseCase' }>>

type AiExtractGapContext = Readonly<{
  existingComponentIds: readonly string[]
  existingLinks: readonly AiExtractExistingLink[]
  existingEventIds: readonly string[]
  existingUseCaseIds: readonly string[]
  eventsWithoutHandler: readonly AiExtractEventWithoutHandler[]
  uncertainLinks: readonly AiExtractUncertainLink[]
}>

/**
 * @riviere-role domain-service
 * @riviere-role-justification Derives AI extraction gap context from components, links, and diagnostics; no state is loaded or retained, and it does not mutate the builder.
 */
export function aiExtractGapContext(
  components: readonly Component[],
  links: readonly Link[],
  diagnostics: readonly WorkflowDiagnostic[],
): AiExtractGapContext {
  const eventHandlerIds = new Set(
    components
      .filter((component) => component.type === 'EventHandler')
      .map((component) => component.id),
  )
  const events = components.filter(
    (component): component is EventComponent => component.type === 'Event',
  )
  const useCases = components.filter(
    (component): component is UseCaseComponent => component.type === 'UseCase',
  )
  const eventsWithoutHandler = events
    .filter(
      (event) =>
        !links.some((link) => link.target === event.id && eventHandlerIds.has(link.source)),
    )
    .map((event) => ({ componentId: event.id, eventName: event.eventName }))
  const uncertainLinks = diagnostics.flatMap((diagnostic) =>
    diagnostic.value.kind === 'uncertain-link'
      ? [{ source: diagnostic.value.source, target: diagnostic.value.target }]
      : [],
  )
  return {
    existingComponentIds: components.map((component) => component.id),
    existingLinks: links.map((link) => ({ source: link.source, target: link.target })),
    existingEventIds: events.map((event) => event.id),
    existingUseCaseIds: useCases.map((useCase) => useCase.id),
    eventsWithoutHandler,
    uncertainLinks,
  }
}

export type {
  AiExtractEventWithoutHandler,
  AiExtractExistingLink,
  AiExtractGapContext,
  AiExtractUncertainLink,
}
