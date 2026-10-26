import type { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type {
  AiExtractComponentDraft,
  AiExtractConfig,
  AiExtractInternalLinkEntry,
  AiExtractResponse,
} from '@living-architecture/riviere-extract-config-published-language'
import { AiExtractCandidateId } from './ai-extract-candidate-id'

const AI_EXTRACT_FALLBACK_PATH = '.riviere/ai-extract'

type AiExtractDraftSourceLocation = Readonly<{ repository: string; filePath: string }>

type ResolvedComponentDraft = AiExtractComponentDraft &
  Readonly<{ sourceLocation: AiExtractDraftSourceLocation }>

type ResolvedLinkEntry = AiExtractInternalLinkEntry &
  Readonly<{
    type: 'async' | 'sync'
    sourceLocation: AiExtractDraftSourceLocation
  }>

type ResolvedAiExtractResponse = Readonly<{
  components: readonly ResolvedComponentDraft[]
  links: readonly ResolvedLinkEntry[]
}>

type ValidateAiExtractResponseInput = Readonly<{
  response: AiExtractResponse
  config: AiExtractConfig
  builder: RiviereBuilder
  repositoryName: string
  sourcePaths: readonly string[]
}>

type ValidateAiExtractResponseResult =
  | Readonly<{ success: true; response: ResolvedAiExtractResponse }>
  | Readonly<{ success: false; errorCode: string; reason: string }>

/**
 * @riviere-role domain-service
 * @riviere-role-justification Validates a supplied AI extraction response against the design request, the supplied Builder contents, and the loaded batch sources; pure check with no state retained.
 */
export function validateAiExtractResponse(
  input: ValidateAiExtractResponseInput,
): ValidateAiExtractResponseResult {
  const missingSourceLocation = missingSourceLocationFailure(input)
  if (missingSourceLocation !== undefined) return missingSourceLocation
  const resolved = resolveResponse(input)
  const failure =
    undeclaredDomainFailure(resolved, input.builder) ??
    outputsFailure(resolved, input.config) ??
    componentTypesFailure(resolved, input.config) ??
    duplicateFailure(resolved) ??
    outOfScopeSourceFailure(resolved, input.sourcePaths) ??
    unknownEndpointFailure(resolved, input.builder)
  return failure ?? { success: true, response: resolved }
}

function missingSourceLocationFailure(
  input: ValidateAiExtractResponseInput,
): ValidateAiExtractResponseResult | undefined {
  if (input.sourcePaths.length < 2) return undefined
  const missingComponent = input.response.components.find(
    (draft) => draft.sourceLocation === undefined,
  )
  if (missingComponent !== undefined) {
    return invalid(
      'AI_EXTRACT_MISSING_SOURCE_LOCATION',
      `AI response omitted 'sourceLocation' for component '${AiExtractCandidateId.fromDraft(missingComponent).toString()}' but the batch holds ${input.sourcePaths.length} source files; declare 'sourceLocation' for every addition when a batch holds more than one file`,
    )
  }
  const missingLink = input.response.links.find((link) => link.sourceLocation === undefined)
  if (missingLink === undefined) return undefined
  return invalid(
    'AI_EXTRACT_MISSING_SOURCE_LOCATION',
    `AI response omitted 'sourceLocation' for link '${missingLink.source} ${missingLink.target}' but the batch holds ${input.sourcePaths.length} source files; declare 'sourceLocation' for every addition when a batch holds more than one file`,
  )
}

function resolveResponse(input: ValidateAiExtractResponseInput): ResolvedAiExtractResponse {
  const defaultLocation: AiExtractDraftSourceLocation = {
    repository: input.repositoryName,
    filePath: input.sourcePaths[0] ?? AI_EXTRACT_FALLBACK_PATH,
  }
  return {
    components: input.response.components.map((draft) => ({
      ...draft,
      sourceLocation: draft.sourceLocation ?? defaultLocation,
    })),
    links: input.response.links.map((link) => ({
      ...link,
      type: link.type ?? 'sync',
      sourceLocation: link.sourceLocation ?? defaultLocation,
    })),
  }
}

function invalid(errorCode: string, reason: string): ValidateAiExtractResponseResult {
  return { success: false, errorCode, reason }
}

function undeclaredDomainFailure(
  resolved: ResolvedAiExtractResponse,
  builder: RiviereBuilder,
): ValidateAiExtractResponseResult | undefined {
  const undeclared = new Set<string>()
  for (const draft of resolved.components) {
    if (!builder.hasDomain(draft.domain)) undeclared.add(draft.domain)
  }
  if (undeclared.size === 0) return undefined
  return invalid(
    'UNDECLARED_IMPORT_DOMAIN',
    `AI extract writes undeclared domains: ${[...undeclared].join(', ')}`,
  )
}

function outputsFailure(
  resolved: ResolvedAiExtractResponse,
  config: AiExtractConfig,
): ValidateAiExtractResponseResult | undefined {
  if (!config.outputs.addComponents && resolved.components.length > 0) {
    return invalid(
      'AI_EXTRACT_UNREQUESTED_ADDITION',
      `AI response included components but 'outputs.add-components' is false`,
    )
  }
  if (!config.outputs.addLinks && resolved.links.length > 0) {
    return invalid(
      'AI_EXTRACT_UNREQUESTED_ADDITION',
      `AI response included links but 'outputs.add-links' is false`,
    )
  }
  return undefined
}

function componentTypesFailure(
  resolved: ResolvedAiExtractResponse,
  config: AiExtractConfig,
): ValidateAiExtractResponseResult | undefined {
  const disallowed = resolved.components.find(
    (draft) => !config.selection.componentTypes.includes(draft.type),
  )
  if (disallowed === undefined) return undefined
  return invalid(
    'AI_EXTRACT_UNREQUESTED_ADDITION',
    `AI response included a component of type '${disallowed.type}' but 'selection.component-types' allows [${config.selection.componentTypes.join(', ')}]`,
  )
}

function duplicateFailure(
  resolved: ResolvedAiExtractResponse,
): ValidateAiExtractResponseResult | undefined {
  const duplicatedComponentId = firstDuplicate(
    resolved.components.map((draft) => AiExtractCandidateId.fromDraft(draft).toString()),
  )
  if (duplicatedComponentId !== undefined) {
    return invalid(
      'AI_EXTRACT_DUPLICATE_CANDIDATE',
      `AI response declared component '${duplicatedComponentId}' more than once`,
    )
  }
  const duplicatedLink = firstDuplicate(
    resolved.links.map((link) => `${link.source} -> ${link.target}`),
  )
  if (duplicatedLink === undefined) return undefined
  return invalid(
    'AI_EXTRACT_DUPLICATE_CANDIDATE',
    `AI response declared link '${duplicatedLink}' more than once`,
  )
}

function firstDuplicate(values: readonly string[]): string | undefined {
  return values.find((value, index) => values.indexOf(value) !== index)
}

function canonicalSourcePath(value: string): string {
  const normalized = value.replaceAll('\\', '/')
  return normalized.endsWith('/') ? canonicalSourcePath(normalized.slice(0, -1)) : normalized
}

function outOfScopeSourceFailure(
  resolved: ResolvedAiExtractResponse,
  sourcePaths: readonly string[],
): ValidateAiExtractResponseResult | undefined {
  const allowedPaths = new Set(sourcePaths.map(canonicalSourcePath))
  if (allowedPaths.size === 0) allowedPaths.add(AI_EXTRACT_FALLBACK_PATH)
  const outOfScopeComponent = resolved.components.find(
    (draft) => !allowedPaths.has(canonicalSourcePath(draft.sourceLocation.filePath)),
  )
  if (outOfScopeComponent !== undefined) {
    return invalid(
      'AI_EXTRACT_OUT_OF_SCOPE_SOURCE',
      `AI response included a component with source location '${outOfScopeComponent.sourceLocation.filePath}' that is not one of the loaded sources`,
    )
  }
  const outOfScopeLink = resolved.links.find(
    (link) => !allowedPaths.has(canonicalSourcePath(link.sourceLocation.filePath)),
  )
  if (outOfScopeLink === undefined) return undefined
  return invalid(
    'AI_EXTRACT_OUT_OF_SCOPE_SOURCE',
    `AI response included a link with source location '${outOfScopeLink.sourceLocation.filePath}' that is not one of the loaded sources`,
  )
}

function unknownEndpointFailure(
  resolved: ResolvedAiExtractResponse,
  builder: RiviereBuilder,
): ValidateAiExtractResponseResult | undefined {
  const knownIds = new Set([
    ...builder.components().map((component) => component.id),
    ...resolved.components.map((draft) => AiExtractCandidateId.fromDraft(draft).toString()),
  ])
  const unknownEndpoint = resolved.links
    .flatMap((link) => [link.source, link.target])
    .find((endpoint) => !knownIds.has(endpoint))
  if (unknownEndpoint === undefined) return undefined
  return invalid(
    'AI_EXTRACT_UNKNOWN_LINK_TARGET',
    `AI response included a link to '${unknownEndpoint}' but that component is not present in the graph`,
  )
}

export type {
  AiExtractDraftSourceLocation,
  ResolvedAiExtractResponse,
  ResolvedComponentDraft,
  ResolvedLinkEntry,
  ValidateAiExtractResponseInput,
  ValidateAiExtractResponseResult,
}
