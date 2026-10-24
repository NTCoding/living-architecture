import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
import type {
  AiExtractComponentDraft,
  AiExtractConfig,
  AiExtractResponse,
} from '@living-architecture/riviere-extract-config-published-language'
import type { WorkflowWarning } from '../workflow'

function canonicalSourcePath(value: string): string {
  const normalized = value.replaceAll('\\', '/')
  return normalized.endsWith('/') ? canonicalSourcePath(normalized.slice(0, -1)) : normalized
}

type ApplyAiExtractResponseInput = Readonly<{
  repositoryName: string
  config: AiExtractConfig
  suppressedComponentIds: readonly string[]
  sourcePaths?: readonly string[]
}>

type ApplyAiExtractResponseResult =
  | Readonly<{ success: true; warnings: readonly WorkflowWarning[] }>
  | Readonly<{ success: false; errorCode: string; reason: string }>

/**
 * @riviere-role domain-service
 * @riviere-role-justification Applies supplied AI extraction drafts to the Project-owned Builder; no state is loaded or retained by the operation.
 * @riviere-design-trade-off Mutates builder violating pure function rule for domain services. User prefers this approach because it is simpler than having service return a data structure that the aggregate applies to the builder, putting more complexity in the aggregate. This choice adds no risk because neither the builder or aggregate can be put in an invalid state, and additionally the builder is a mutable object (for perf reasons) intended to be gradually built by each step.
 */

export function applyAiExtractResponse(
  builder: RiviereBuilder,
  response: AiExtractResponse,
  input: ApplyAiExtractResponseInput,
): ApplyAiExtractResponseResult {
  const filtered = suppressEntries(response, input.suppressedComponentIds)
  const sourcePaths = input.sourcePaths
  const sourceFailure =
    sourcePaths === undefined ? undefined : outOfScopeSourceFailure(filtered, sourcePaths)
  if (sourceFailure !== undefined) return sourceFailure
  const validationFailure = preApplyValidation(filtered, builder, input)
  if (validationFailure !== undefined) return validationFailure
  const componentIds = new Set(builder.components().map((component) => component.id))
  const warnings: WorkflowWarning[] = []
  for (const draft of filtered.components) {
    if (!input.config.selection.componentTypes.includes(draft.type)) {
      return unrequested(
        `AI response included a component of type '${draft.type}' but 'selection.component-types' allows [${input.config.selection.componentTypes.join(', ')}]`,
      )
    }
    const componentId = draftComponentId(draft)
    if (componentIds.has(componentId)) {
      warnings.push(alreadyPresent(`AI candidate already present: '${componentId}'`))
      continue
    }
    upsertDraft(builder, draft, input.repositoryName)
    componentIds.add(componentId)
  }
  for (const link of filtered.links) {
    const unknownEndpoint = [link.source, link.target].find(
      (endpoint) => !componentIds.has(endpoint),
    )
    if (unknownEndpoint !== undefined) {
      return {
        success: false,
        errorCode: 'AI_EXTRACT_UNKNOWN_LINK_TARGET',
        reason: `AI response included a link from '${link.source}' to '${link.target}' but '${unknownEndpoint}' is not present in the graph`,
      }
    }
    const result = builder.upsertLink({
      from: link.source,
      to: link.target,
      type: link.type,
      sourceLocation: { repository: input.repositoryName, filePath: link.sourceLocation.filePath },
    })
    if (!result.created) {
      warnings.push(
        alreadyPresent(`AI candidate link already present: '${link.source}' '${link.target}'`),
      )
    }
  }
  return { success: true, warnings }
}

function undeclaredDraftDomains(
  builder: RiviereBuilder,
  response: AiExtractResponse,
): readonly string[] {
  const undeclared: string[] = []
  for (const draft of response.components) {
    if (!builder.hasDomain(draft.domain) && !undeclared.includes(draft.domain))
      undeclared.push(draft.domain)
  }
  return undeclared
}

function suppressEntries(
  response: AiExtractResponse,
  suppressedComponentIds: readonly string[],
): AiExtractResponse {
  const suppressed = new Set(suppressedComponentIds)
  return {
    components: response.components.filter((draft) => !suppressed.has(draftComponentId(draft))),
    links: response.links.filter(
      (link) => !suppressed.has(link.source) && !suppressed.has(link.target),
    ),
  }
}

function builderComponentType(draftType: AiExtractComponentDraft['type']): string {
  switch (draftType) {
    case 'UI':
      return 'ui'
    case 'API':
      return 'api'
    case 'UseCase':
      return 'usecase'
    case 'DomainOp':
      return 'domainop'
    case 'Event':
      return 'event'
    case 'EventHandler':
      return 'eventhandler'
    case 'Custom':
      return 'custom'
  }
}

function draftComponentId(draft: AiExtractComponentDraft): string {
  return ComponentId.parseFromParts({
    domain: draft.domain,
    module: draft.module,
    type: builderComponentType(draft.type),
    name: draft.name,
  }).toString()
}

type AiExtractDraftSourceLocation = Readonly<{ repository: string; filePath: string }>

type UiDraft = Extract<AiExtractComponentDraft, Readonly<{ type: 'UI' }>>
type ApiDraft = Extract<AiExtractComponentDraft, Readonly<{ type: 'API' }>>
type DomainOpDraft = Extract<AiExtractComponentDraft, Readonly<{ type: 'DomainOp' }>>
type EventDraft = Extract<AiExtractComponentDraft, Readonly<{ type: 'Event' }>>
type EventHandlerDraft = Extract<AiExtractComponentDraft, Readonly<{ type: 'EventHandler' }>>
type DraftParameter = NonNullable<NonNullable<DomainOpDraft['signature']>['parameters']>[number]

function upsertDraft(
  builder: RiviereBuilder,
  draft: AiExtractComponentDraft,
  repositoryName: string,
): void {
  const sourceLocation = { repository: repositoryName, filePath: draft.sourceLocation.filePath }
  switch (draft.type) {
    case 'UI':
      return upsertUiDraft(builder, draft, sourceLocation)
    case 'API':
      return upsertApiDraft(builder, draft, sourceLocation)
    case 'UseCase':
      builder.upsertUseCase(draftCommonFields(draft, sourceLocation), { noOverwrite: true })
      return
    case 'DomainOp':
      return upsertDomainOpDraft(builder, draft, sourceLocation)
    case 'Event':
      return upsertEventDraft(builder, draft, sourceLocation)
    case 'EventHandler':
      return upsertEventHandlerDraft(builder, draft, sourceLocation)
    case 'Custom':
      builder.upsertCustom(
        { ...draftCommonFields(draft, sourceLocation), customTypeName: draft.customTypeName },
        { noOverwrite: true },
      )
      return
  }
}

function draftCommonFields(
  draft: AiExtractComponentDraft,
  sourceLocation: AiExtractDraftSourceLocation,
): Readonly<{
  name: string
  domain: string
  module: string
  sourceLocation: AiExtractDraftSourceLocation
}> {
  return {
    name: draft.name,
    domain: draft.domain,
    module: draft.module,
    sourceLocation,
    ...(draft.description === undefined ? {} : { description: draft.description }),
  }
}

function upsertUiDraft(
  builder: RiviereBuilder,
  draft: UiDraft,
  sourceLocation: AiExtractDraftSourceLocation,
): void {
  builder.upsertUI(
    { ...draftCommonFields(draft, sourceLocation), route: draft.route },
    { noOverwrite: true },
  )
}

function upsertApiDraft(
  builder: RiviereBuilder,
  draft: ApiDraft,
  sourceLocation: AiExtractDraftSourceLocation,
): void {
  builder.upsertApi(
    {
      ...draftCommonFields(draft, sourceLocation),
      apiType: draft.apiType,
      ...(draft.httpMethod === undefined ? {} : { httpMethod: draft.httpMethod }),
      ...(draft.path === undefined ? {} : { path: draft.path }),
      ...(draft.operationName === undefined ? {} : { operationName: draft.operationName }),
    },
    { noOverwrite: true },
  )
}

function upsertDomainOpDraft(
  builder: RiviereBuilder,
  draft: DomainOpDraft,
  sourceLocation: AiExtractDraftSourceLocation,
): void {
  builder.upsertDomainOp(
    {
      ...draftCommonFields(draft, sourceLocation),
      operationName: draft.operationName,
      ...(draft.entity === undefined ? {} : { entity: draft.entity }),
      ...(draft.signature === undefined ? {} : { signature: operationSignature(draft.signature) }),
      ...(draft.behavior === undefined ? {} : { behavior: operationBehavior(draft.behavior) }),
      ...(draft.stateChanges === undefined
        ? {}
        : { stateChanges: domainOpStateChanges(draft.stateChanges) }),
      ...(draft.businessRules === undefined ? {} : { businessRules: draft.businessRules }),
    },
    { noOverwrite: true },
  )
}

function operationSignature(signature: NonNullable<DomainOpDraft['signature']>) {
  return {
    ...(signature.parameters === undefined
      ? {}
      : { parameters: signature.parameters.map(operationParameter) }),
    ...(signature.returnType === undefined ? {} : { returnType: signature.returnType }),
  }
}

function operationParameter(parameter: DraftParameter) {
  return {
    name: parameter.name,
    type: parameter.type,
    ...(parameter.description === undefined ? {} : { description: parameter.description }),
  }
}

function operationBehavior(behavior: NonNullable<DomainOpDraft['behavior']>) {
  return {
    ...(behavior.reads === undefined ? {} : { reads: behavior.reads }),
    ...(behavior.validates === undefined ? {} : { validates: behavior.validates }),
    ...(behavior.modifies === undefined ? {} : { modifies: behavior.modifies }),
    ...(behavior.emits === undefined ? {} : { emits: behavior.emits }),
  }
}

function domainOpStateChanges(states: NonNullable<DomainOpDraft['stateChanges']>) {
  return states.map((state) => ({
    from: state.from,
    to: state.to,
    ...(state.trigger === undefined ? {} : { trigger: state.trigger }),
  }))
}

function upsertEventDraft(
  builder: RiviereBuilder,
  draft: EventDraft,
  sourceLocation: AiExtractDraftSourceLocation,
): void {
  builder.upsertEvent(
    {
      ...draftCommonFields(draft, sourceLocation),
      eventName: draft.eventName,
      ...(draft.eventSchema === undefined ? {} : { eventSchema: draft.eventSchema }),
    },
    { noOverwrite: true },
  )
}

function upsertEventHandlerDraft(
  builder: RiviereBuilder,
  draft: EventHandlerDraft,
  sourceLocation: AiExtractDraftSourceLocation,
): void {
  builder.upsertEventHandler(
    { ...draftCommonFields(draft, sourceLocation), subscribedEvents: draft.subscribedEvents },
    { noOverwrite: true },
  )
}

function unrequested(reason: string): ApplyAiExtractResponseResult {
  return { success: false, errorCode: 'AI_EXTRACT_UNREQUESTED_ADDITION', reason }
}

function alreadyPresent(message: string): WorkflowWarning {
  return { code: 'AI_CANDIDATE_ALREADY_PRESENT', message }
}

export type { ApplyAiExtractResponseInput, ApplyAiExtractResponseResult }

function outOfScopeSourceFailure(
  filtered: AiExtractResponse,
  sourcePaths: readonly string[],
): ApplyAiExtractResponseResult | undefined {
  const allowedPaths = new Set(sourcePaths.map(canonicalSourcePath))
  const outOfScopeComponent = filtered.components.find(
    (draft) => !allowedPaths.has(canonicalSourcePath(draft.sourceLocation.filePath)),
  )
  if (outOfScopeComponent !== undefined) {
    return {
      success: false,
      errorCode: 'AI_EXTRACT_OUT_OF_SCOPE_SOURCE',
      reason: `AI response included a component with source location '${outOfScopeComponent.sourceLocation.filePath}' that is not one of the loaded sources`,
    }
  }
  const outOfScopeLink = filtered.links.find(
    (link) => !allowedPaths.has(canonicalSourcePath(link.sourceLocation.filePath)),
  )
  if (outOfScopeLink !== undefined) {
    return {
      success: false,
      errorCode: 'AI_EXTRACT_OUT_OF_SCOPE_SOURCE',
      reason: `AI response included a link with source location '${outOfScopeLink.sourceLocation.filePath}' that is not one of the loaded sources`,
    }
  }
  return undefined
}

function preApplyValidation(
  filtered: AiExtractResponse,
  builder: RiviereBuilder,
  input: ApplyAiExtractResponseInput,
): ApplyAiExtractResponseResult | undefined {
  const undeclaredDomains = undeclaredDraftDomains(builder, filtered)
  if (undeclaredDomains.length > 0) {
    return {
      success: false,
      errorCode: 'UNDECLARED_IMPORT_DOMAIN',
      reason: `AI extract writes undeclared domains: ${undeclaredDomains.join(', ')}`,
    }
  }
  if (!input.config.outputs.addComponents && filtered.components.length > 0) {
    return unrequested(`AI response included components but 'outputs.add-components' is false`)
  }
  if (!input.config.outputs.addLinks && filtered.links.length > 0) {
    return unrequested(`AI response included links but 'outputs.add-links' is false`)
  }
  return undefined
}
