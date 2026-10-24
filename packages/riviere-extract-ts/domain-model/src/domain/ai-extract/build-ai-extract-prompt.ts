import type {
  AiExtractConfig,
  AiExtractionGap,
} from '@living-architecture/riviere-extract-config-published-language'
import type { AiExtractMemory } from './ai-extract-memory'
import type { AiExtractEventWithoutHandler, AiExtractGapContext } from './ai-extract-gap-context'
import type { AiExtractSourceBatch } from './select-ai-extract-batches'

type BuildAiExtractPromptInput = Readonly<{
  repositoryName: string
  config: AiExtractConfig
  context: AiExtractGapContext
  batch: AiExtractSourceBatch
  batchCount: number
  memory: AiExtractMemory
  promptAppend: string | undefined
}>

const RESPONSE_CONTRACT = [
  'Respond with a single JSON object and nothing else:',
  '{"components": [...], "links": [...]}',
  'Component drafts: {"type", "name", "domain", "module", "description"?, "sourceLocation": {"repository", "filePath"}} plus type-specific fields:',
  '- UI: "route"',
  '- API: "apiType" ("REST" | "GraphQL" | "other"), "httpMethod"?, "path"?, "operationName"?',
  '- UseCase: (no extra fields)',
  '- DomainOp: "operationName", "entity"?, "signature"?, "behavior"?, "stateChanges"?, "businessRules"?',
  '- Event: "eventName", "eventSchema"?',
  '- EventHandler: "subscribedEvents" (array of event names)',
  '- Custom: "customTypeName"',
  'Link entries: {"source", "target", "type" ("sync" | "async"), "sourceLocation": {"repository", "filePath"}}.',
  'Link "source" and "target" must be canonical component IDs from the graph.',
].join('\n')

function eventWithoutHandlerLine(event: AiExtractEventWithoutHandler): string {
  if (event.eventName === undefined) return `  ${event.componentId}`
  return `  ${event.componentId} (event name: ${event.eventName})`
}

function gapInstructions(gap: AiExtractionGap, context: AiExtractGapContext): readonly string[] {
  switch (gap) {
    case 'uncertain-links':
      return [
        '- uncertain-links: For each unresolved uncertain link listed below, propose the components or links needed to resolve it.',
        ...context.uncertainLinks.map((link) => `  ${link.source} -> ${link.target}`),
      ]
    case 'missing-events':
      return [
        '- missing-events: Propose Event drafts for event-publishing call sites in the source files that are not listed under existing components.',
      ]
    case 'missing-event-handlers':
      return [
        '- missing-event-handlers: For each event below that has no outbound link to an EventHandler, propose an EventHandler draft for the handler call sites in the source files and a link from the event to the handler.',
        ...context.eventsWithoutHandler.map(eventWithoutHandlerLine),
      ]
    case 'missing-use-cases':
      return [
        '- missing-use-cases: Propose UseCase drafts for use-case-shaped call sites in the source files that are not listed under existing components.',
      ]
  }
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification Assembles an AI extraction prompt from supplied gap context, config, batch sources, and memory; pure transformation with no I/O or retained state.
 */
export function buildAiExtractPrompt(input: BuildAiExtractPromptInput): string {
  const { config, context, batch, batchCount, memory } = input
  const sections: string[] = [
    `You are extending a Rivière architecture graph for the repository '${input.repositoryName}'.`,
    'Analyze ONLY these gap categories and propose additions as JSON:',
    ...config.selection.from.flatMap((gap) => gapInstructions(gap, context)),
    RESPONSE_CONTRACT,
    `Allowed component types: ${config.selection.componentTypes.join(', ')}`,
    `Components may be added: ${config.outputs.addComponents ? 'yes' : 'no'}`,
    `Links may be added: ${config.outputs.addLinks ? 'yes' : 'no'}`,
    'Existing components:',
    ...context.existingComponentIds.map((componentId) => `- ${componentId}`),
    'Existing links:',
    ...context.existingLinks.map((link) => `- ${link.source} -> ${link.target}`),
    'Unresolved uncertain links:',
    ...context.uncertainLinks.map((link) => `- ${link.source} -> ${link.target}`),
    `Source files (batch ${batch.index + 1} of ${batchCount}):`,
    ...batch.files.flatMap((file) => [`--- ${file.path} ---`, file.content]),
  ]
  if (memory.prose !== undefined) sections.push('Memory:', memory.prose)
  if (memory.suppressedComponentIds.length > 0) {
    sections.push(
      `Suppressed component IDs (never propose these): ${memory.suppressedComponentIds.join(', ')}`,
    )
  }
  if (input.promptAppend !== undefined)
    sections.push('Additional instructions:', input.promptAppend)
  return sections.join('\n')
}
