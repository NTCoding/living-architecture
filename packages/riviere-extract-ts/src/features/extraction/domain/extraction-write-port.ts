import {
  ComponentId,
  type ExternalLink,
  type LinkType,
  type SourceLocation,
} from '@living-architecture/riviere-schema'
import {
  DuplicateComponentError,
  type APIInput,
  type CustomInput,
  type EventHandlerInput,
  type EventInput,
  type ExternalLinkInput,
  type LinkInput,
  type RiviereBuilder,
  type UIInput,
  type UseCaseInput,
  type DomainOpInput,
} from '@living-architecture/riviere-builder'

/** @riviere-role value-object */
export interface MissingFieldDiagnosticEvent {
  componentId: string
  field: string
  reason: string
}

/** @riviere-role value-object */
export interface UncertainLinkDiagnosticEvent {
  source: string
  target: string
  linkType: string
  reason: string
}

/** @riviere-role value-object */
export type ComponentWriteInput =
  | ({ type: 'ui' } & UIInput)
  | ({ type: 'api' } & APIInput)
  | ({ type: 'useCase' } & UseCaseInput)
  | ({ type: 'domainOp' } & DomainOpInput)
  | ({ type: 'event' } & EventInput)
  | ({ type: 'eventHandler' } & EventHandlerInput)
  | ({ type: 'custom' } & CustomInput)

/** @riviere-role value-object */
export type LinkWriteInput = LinkInput

/** @riviere-role value-object */
export type ExternalLinkWriteInput = ExternalLinkInput

/** @riviere-role value-object */
export interface ExtractionWritePort {
  addComponent(input: ComponentWriteInput): void
  addLink(input: LinkWriteInput): void
  addExternalLink(input: ExternalLinkWriteInput): void
  reportMissingField(event: MissingFieldDiagnosticEvent): void
  reportUncertainLink(event: UncertainLinkDiagnosticEvent): void
}

/** @riviere-role value-object */
interface StrictWritePortDiagnostics {
  missingFields(): MissingFieldDiagnosticEvent[]
  uncertainLinks(): UncertainLinkDiagnosticEvent[]
}

/** @riviere-role value-object */
export type StrictExtractionWritePort = ExtractionWritePort & StrictWritePortDiagnostics

/** @riviere-role value-object */
export type WorkflowDiagnosticEvent =
  | ({ kind: 'missing-field' } & MissingFieldDiagnosticEvent)
  | ({ kind: 'uncertain-link' } & UncertainLinkDiagnosticEvent)

/** @riviere-role value-object */
export interface WorkflowDiagnostics {report(event: WorkflowDiagnosticEvent): void}

/** @riviere-role value-object */
export interface WorkflowBuilder {
  upsertUI(input: UIInput): { created: boolean }
  upsertApi(input: APIInput): { created: boolean }
  upsertUseCase(input: UseCaseInput): { created: boolean }
  upsertDomainOp(input: DomainOpInput): { created: boolean }
  upsertEvent(input: EventInput): { created: boolean }
  upsertEventHandler(input: EventHandlerInput): { created: boolean }
  upsertCustom(input: CustomInput): { created: boolean }
  link(input: LinkInput): unknown
  linkExternal(input: ExternalLinkInput): ExternalLink
  defineCustomType(input: {
    name: string;
    description?: string 
  }): void
}

/** @riviere-role value-object */
export interface WorkflowStepContext {
  step: string
  stepType: string
}

/** @riviere-role domain-error */
export class SameStepDuplicateComponentError extends Error {
  readonly componentId: string
  readonly step: string
  readonly stepType: string

  constructor(componentId: string, step: string, stepType: string) {
    super(
      `Component '${componentId}' was emitted more than once during step '${step}' (${stepType})`,
    )
    this.name = 'SameStepDuplicateComponentError'
    this.componentId = componentId
    this.step = step
    this.stepType = stepType
  }
}

/** @riviere-role domain-service */
export function strictWritePort(builder: RiviereBuilder): StrictExtractionWritePort {
  const missingFieldEvents: MissingFieldDiagnosticEvent[] = []
  const uncertainLinkEvents: UncertainLinkDiagnosticEvent[] = []
  const definedCustomTypes = new Set<string>()

  return {
    addComponent(input) {
      defineCustomTypeWhenNeeded(input, definedCustomTypes, builder)
      dispatchStrictComponentWrite(builder, input)
    },
    addLink(input) {
      builder.link(input)
    },
    addExternalLink(input) {
      builder.linkExternal(input)
    },
    reportMissingField(event) {
      missingFieldEvents.push(event)
    },
    reportUncertainLink(event) {
      uncertainLinkEvents.push(event)
    },
    missingFields() {
      return [...missingFieldEvents]
    },
    uncertainLinks() {
      return [...uncertainLinkEvents]
    },
  }
}

/** @riviere-role domain-service */
export function mergeWritePort(
  builder: WorkflowBuilder,
  diagnostics: WorkflowDiagnostics,
  stepContext: WorkflowStepContext,
): ExtractionWritePort {
  const emittedComponentIds = new Set<string>()
  const definedCustomTypes = new Set<string>()

  return {
    addComponent(input) {
      const componentId = toCanonicalComponentId(input)
      if (emittedComponentIds.has(componentId)) {
        throw new SameStepDuplicateComponentError(
          componentId,
          stepContext.step,
          stepContext.stepType,
        )
      }

      emittedComponentIds.add(componentId)
      defineCustomTypeWhenNeeded(input, definedCustomTypes, builder)
      dispatchMergeComponentWrite(builder, input)
    },
    addLink(input) {
      builder.link(input)
    },
    addExternalLink(input) {
      builder.linkExternal(input)
    },
    reportMissingField(event) {
      diagnostics.report({
        kind: 'missing-field',
        ...event,
      })
    },
    reportUncertainLink(event) {
      diagnostics.report({
        kind: 'uncertain-link',
        ...event,
      })
    },
  }
}

/** @riviere-role domain-service */
export function toCanonicalComponentId(input: ComponentWriteInput): string {
  return ComponentId.create({
    domain: input.domain,
    module: input.module,
    type: toComponentIdTypeSegment(input.type),
    name: input.name,
  }).toString()
}

/** @riviere-role domain-service */
export function toSourceLocation(
  repository: string,
  filePath: string,
  lineNumber: number,
): SourceLocation {
  return {
    repository,
    filePath,
    lineNumber,
  }
}

function dispatchStrictComponentWrite(builder: RiviereBuilder, input: ComponentWriteInput): void {
  if (input.type === 'ui') {
    builder.addUI(input)
    return
  }
  if (input.type === 'api') {
    builder.addApi(input)
    return
  }
  if (input.type === 'useCase') {
    builder.addUseCase(input)
    return
  }
  if (input.type === 'domainOp') {
    builder.addDomainOp(input)
    return
  }
  if (input.type === 'event') {
    builder.addEvent(input)
    return
  }
  if (input.type === 'eventHandler') {
    builder.addEventHandler(input)
    return
  }
  builder.addCustom(input)
}

function dispatchMergeComponentWrite(builder: WorkflowBuilder, input: ComponentWriteInput): void {
  if (input.type === 'ui') {
    builder.upsertUI(input)
    return
  }
  if (input.type === 'api') {
    builder.upsertApi(input)
    return
  }
  if (input.type === 'useCase') {
    builder.upsertUseCase(input)
    return
  }
  if (input.type === 'domainOp') {
    builder.upsertDomainOp(input)
    return
  }
  if (input.type === 'event') {
    builder.upsertEvent(input)
    return
  }
  if (input.type === 'eventHandler') {
    builder.upsertEventHandler(input)
    return
  }
  builder.upsertCustom(input)
}

function defineCustomTypeWhenNeeded(
  input: ComponentWriteInput,
  definedCustomTypes: Set<string>,
  builder: Pick<RiviereBuilder, 'defineCustomType'> | Pick<WorkflowBuilder, 'defineCustomType'>,
): void {
  if (input.type !== 'custom') {
    return
  }

  if (definedCustomTypes.has(input.customTypeName)) {
    return
  }

  try {
    builder.defineCustomType({ name: input.customTypeName })
  } catch (error) {
    if (!(error instanceof DuplicateComponentError)) {
      throw error
    }
  }

  definedCustomTypes.add(input.customTypeName)
}

function toComponentIdTypeSegment(type: ComponentWriteInput['type']): string {
  if (type === 'useCase') {
    return 'usecase'
  }
  if (type === 'domainOp') {
    return 'domainop'
  }
  if (type === 'eventHandler') {
    return 'eventhandler'
  }
  return type
}

/** @riviere-role domain-service */
export function createLinkWriteInput(
  source: string,
  target: string,
  type?: LinkType,
): LinkWriteInput {
  if (type === undefined) {
    return {
      from: source,
      to: target,
    }
  }

  return {
    from: source,
    to: target,
    type,
  }
}
