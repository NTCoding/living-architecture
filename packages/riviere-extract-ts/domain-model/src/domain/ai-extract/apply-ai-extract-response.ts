import type { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import type { WorkflowDiagnostic } from '../workflow-diagnostic'
import type { WorkflowWarning } from '../workflow'
import { AiExtractCandidateId } from './ai-extract-candidate-id'
import type {
  AiExtractDraftSourceLocation,
  ResolvedAiExtractResponse,
  ResolvedComponentDraft,
} from './validate-ai-extract-response'

type ApplyAiExtractResponseInput = Readonly<{
  repositoryName: string
  unresolvedDiagnostics: readonly WorkflowDiagnostic[]
}>

type ApplyAiExtractResponseResult = Readonly<{
  warnings: readonly WorkflowWarning[]
  collisions: readonly string[]
  resolvedDiagnostics: readonly WorkflowDiagnostic[]
}>

/**
 * Applies a validated AI extraction response to the Project-owned Builder.
 *
 * @riviere-role domain-service
 * @riviere-role-justification Applies supplied AI extraction drafts to the Project-owned Builder; no state is loaded or retained by the operation.
 * @riviere-design-trade-off Mutates builder violating pure function rule for domain services. User prefers this approach because it is simpler than having service return a data structure that the aggregate applies to the builder, putting more complexity in the aggregate. This choice adds no risk because neither the builder or aggregate can be put in an invalid state, and additionally the builder is a mutable object (for perf reasons) intended to be gradually built by each step.
 */
export function applyAiExtractResponse(
  builder: RiviereBuilder,
  response: ResolvedAiExtractResponse,
  input: ApplyAiExtractResponseInput,
): ApplyAiExtractResponseResult {
  const collisions: string[] = []
  const warnings: WorkflowWarning[] = []
  for (const draft of response.components) {
    if (upsertDraft(builder, draft, input.repositoryName)) continue
    const componentId = AiExtractCandidateId.fromDraft(draft).toString()
    collisions.push(componentId)
    warnings.push(alreadyPresent(`AI candidate already present: '${componentId}'`))
  }
  for (const link of response.links) {
    const result = builder.upsertLink({
      from: link.source,
      to: link.target,
      type: link.type,
      ...(link.relationshipType === undefined ? {} : { relationshipType: link.relationshipType }),
      ...(link.condition === undefined ? {} : { condition: link.condition }),
      sourceLocation: { repository: input.repositoryName, filePath: link.sourceLocation.filePath },
    })
    if (result.created) continue
    collisions.push(`${link.source}->${link.target}`)
    warnings.push(
      alreadyPresent(`AI candidate link already present: '${link.source}' '${link.target}'`),
    )
  }
  return {
    warnings,
    collisions,
    resolvedDiagnostics: resolveDiagnostics(response, input.unresolvedDiagnostics),
  }
}

function resolveDiagnostics(
  response: ResolvedAiExtractResponse,
  diagnostics: readonly WorkflowDiagnostic[],
): readonly WorkflowDiagnostic[] {
  const proposedLinks = new Set(
    response.links.map((link) => linkPair({ source: link.source, target: link.target })),
  )
  const proposedComponentIds = new Set(
    response.components.map((draft) => AiExtractCandidateId.fromDraft(draft).toString()),
  )
  return diagnostics.filter((diagnostic) => {
    const value = diagnostic.value
    if (value.kind !== 'uncertain-link') return false
    const endpointsProposed =
      proposedComponentIds.has(value.source) && proposedComponentIds.has(value.target)
    return endpointsProposed || proposedLinks.has(linkPair(value))
  })
}

function linkPair(link: Readonly<{ source: string; target: string }>): string {
  return `${link.source}\u0000${link.target}`
}

function alreadyPresent(message: string): WorkflowWarning {
  return { code: 'AI_CANDIDATE_ALREADY_PRESENT', message }
}

function upsertDraft(
  builder: RiviereBuilder,
  draft: ResolvedComponentDraft,
  repositoryName: string,
): boolean {
  const sourceLocation: AiExtractDraftSourceLocation = {
    repository: repositoryName,
    filePath: draft.sourceLocation.filePath,
  }
  const common = commonInput(draft, sourceLocation)
  switch (draft.type) {
    case 'UI':
      return builder.upsertUI({ ...common, route: draft.route }, { noOverwrite: true }).created
    case 'API':
      return builder.upsertApi(apiInput(draft, sourceLocation), { noOverwrite: true }).created
    case 'UseCase':
      return builder.upsertUseCase(common, { noOverwrite: true }).created
    case 'DomainOp':
      return builder.upsertDomainOp(domainOpInput(draft, sourceLocation), { noOverwrite: true })
        .created
    case 'Event':
      return builder.upsertEvent(eventInput(draft, sourceLocation), { noOverwrite: true }).created
    case 'EventHandler':
      return builder.upsertEventHandler(
        { ...common, subscribedEvents: draft.subscribedEvents },
        { noOverwrite: true },
      ).created
    case 'Custom':
      return builder.upsertCustom(
        { ...common, customTypeName: draft.customTypeName },
        { noOverwrite: true },
      ).created
  }
}

type ApiDraft = Extract<ResolvedComponentDraft, Readonly<{ type: 'API' }>>
type DomainOpDraft = Extract<ResolvedComponentDraft, Readonly<{ type: 'DomainOp' }>>
type EventDraft = Extract<ResolvedComponentDraft, Readonly<{ type: 'Event' }>>

function commonInput(draft: ResolvedComponentDraft, sourceLocation: AiExtractDraftSourceLocation) {
  const base = { name: draft.name, domain: draft.domain, module: draft.module, sourceLocation }
  if (draft.description === undefined) return base
  return { ...base, description: draft.description }
}

function apiInput(draft: ApiDraft, sourceLocation: AiExtractDraftSourceLocation) {
  return {
    ...commonInput(draft, sourceLocation),
    apiType: draft.apiType,
    ...(draft.httpMethod === undefined ? {} : { httpMethod: draft.httpMethod }),
    ...(draft.path === undefined ? {} : { path: draft.path }),
    ...(draft.operationName === undefined ? {} : { operationName: draft.operationName }),
  }
}

function domainOpInput(draft: DomainOpDraft, sourceLocation: AiExtractDraftSourceLocation) {
  return {
    ...commonInput(draft, sourceLocation),
    operationName: draft.operationName,
    ...(draft.entity === undefined ? {} : { entity: draft.entity }),
    ...signatureField(draft),
    ...behaviorField(draft),
    ...(draft.stateChanges === undefined
      ? {}
      : { stateChanges: draft.stateChanges.map(stateChangeInput) }),
    ...(draft.businessRules === undefined ? {} : { businessRules: [...draft.businessRules] }),
  }
}

function signatureField(draft: DomainOpDraft) {
  const signature = draft.signature
  if (signature === undefined) return {}
  return {
    signature: {
      ...(signature.parameters === undefined
        ? {}
        : { parameters: signature.parameters.map(parameterInput) }),
      ...(signature.returnType === undefined ? {} : { returnType: signature.returnType }),
    },
  }
}

function parameterInput(
  parameter: NonNullable<DomainOpDraft['signature']>['parameters'] extends
    | readonly (infer Parameter)[]
    | undefined
    ? Parameter
    : never,
) {
  return {
    name: parameter.name,
    type: parameter.type,
    ...(parameter.description === undefined ? {} : { description: parameter.description }),
  }
}

function behaviorField(draft: DomainOpDraft) {
  const behavior = draft.behavior
  if (behavior === undefined) return {}
  return {
    behavior: {
      ...(behavior.reads === undefined ? {} : { reads: [...behavior.reads] }),
      ...(behavior.validates === undefined ? {} : { validates: [...behavior.validates] }),
      ...(behavior.modifies === undefined ? {} : { modifies: [...behavior.modifies] }),
      ...(behavior.emits === undefined ? {} : { emits: [...behavior.emits] }),
    },
  }
}

function stateChangeInput(stateChange: NonNullable<DomainOpDraft['stateChanges']>[number]) {
  return {
    from: stateChange.from,
    to: stateChange.to,
    ...(stateChange.trigger === undefined ? {} : { trigger: stateChange.trigger }),
  }
}

function eventInput(draft: EventDraft, sourceLocation: AiExtractDraftSourceLocation) {
  return {
    ...commonInput(draft, sourceLocation),
    eventName: draft.eventName,
    ...(draft.eventSchema === undefined ? {} : { eventSchema: draft.eventSchema }),
  }
}

export type { ApplyAiExtractResponseInput, ApplyAiExtractResponseResult }
