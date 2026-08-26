import type {
  APIComponent,
  Component as PublishedComponent,
  CustomComponent,
  DomainOpComponent,
  EventComponent,
  EventHandlerComponent,
  UIComponent,
  UseCaseComponent,
} from '@living-architecture/riviere-schema-published-language/schema'
import { BusinessRules } from './business-rules'
import { ComponentTypeMismatchError } from './construction/construction-errors'
import { CustomComponentProperties } from './custom-component-properties'
import { DomainOperationBehavior } from './domain-operation-behavior'
import { ExistingValuePreference } from './existing-value-preference'
import { StateTransitions } from './state-transitions'
import { SubscribedEvents } from './subscribed-events'
import { InvalidEnrichmentTargetError } from './enrichment/enrichment-errors'

type Primitive = string | number | boolean
type ScalarOverwrite = Readonly<{
  field: string
  oldValue: Primitive
  newValue: Primitive
}>
type ComponentUpdate = Readonly<{
  component: PublishedComponent
  overwrites: readonly ScalarOverwrite[]
}>
type Enrichment = Readonly<
  Pick<DomainOpComponent, 'entity' | 'stateChanges' | 'businessRules' | 'behavior' | 'signature'>
>

/** @riviere-role aggregate-entity */
export class Component {
  private constructor(private state: PublishedComponent) {}

  static create(state: PublishedComponent): Component {
    if (state.type === 'DomainOp') {
      if (state.behavior !== undefined)
        state.behavior = DomainOperationBehavior.parse(state.behavior).value
      if (state.stateChanges !== undefined)
        state.stateChanges = [...StateTransitions.parse(state.stateChanges).values]
      if (state.businessRules !== undefined)
        state.businessRules = [...BusinessRules.parse(state.businessRules).values]
    }
    if (state.type === 'EventHandler')
      state.subscribedEvents = [...SubscribedEvents.parseValues(state.subscribedEvents).values]
    return new Component(state)
  }

  id(): string {
    return this.state.id
  }

  published(): PublishedComponent {
    return this.state
  }

  update(
    incoming: PublishedComponent,
    preference: ExistingValuePreference,
    incomingCustomProperties?: Readonly<Record<string, unknown>>,
  ): ComponentUpdate {
    const overwrites: ScalarOverwrite[] = []
    this.state = this.mergeIncoming(incoming, preference, incomingCustomProperties, overwrites)
    return { component: this.state, overwrites }
  }

  private mergeIncoming(
    incoming: PublishedComponent,
    preference: ExistingValuePreference,
    incomingCustomProperties: Readonly<Record<string, unknown>> | undefined,
    overwrites: ScalarOverwrite[],
  ): PublishedComponent {
    switch (incoming.type) {
      case 'UI':
        return mergeUI(this.ui(incoming), incoming, preference, overwrites)
      case 'API':
        return mergeAPI(this.api(incoming), incoming, preference, overwrites)
      case 'UseCase':
        return mergeUseCase(this.useCase(incoming), incoming, preference, overwrites)
      case 'DomainOp':
        return mergeDomainOp(this.domainOp(incoming), incoming, preference, overwrites)
      case 'Event':
        return mergeEvent(this.event(incoming), incoming, preference, overwrites)
      case 'EventHandler':
        return mergeEventHandler(this.eventHandler(incoming), incoming, preference, overwrites)
      case 'Custom':
        return mergeCustom(
          this.custom(incoming),
          incoming,
          incomingCustomProperties,
          preference,
          overwrites,
        )
    }
  }

  enrichDomainOperation(enrichment: Enrichment): void {
    if (this.state.type !== 'DomainOp') {
      throw new InvalidEnrichmentTargetError(this.state.id, this.state.type)
    }
    const existing = this.state
    this.state = {
      ...existing,
      ...(enrichment.entity === undefined ? {} : { entity: enrichment.entity }),
      ...(enrichment.signature === undefined ? {} : { signature: enrichment.signature }),
      ...(enrichment.behavior === undefined
        ? {}
        : {
            behavior: DomainOperationBehavior.parse(existing.behavior).including(
              enrichment.behavior,
            ).value,
          }),
      ...(enrichment.stateChanges === undefined
        ? {}
        : {
            stateChanges: [
              ...StateTransitions.parse(existing.stateChanges).including(enrichment.stateChanges)
                .values,
            ],
          }),
      ...(enrichment.businessRules === undefined
        ? {}
        : {
            businessRules: [
              ...BusinessRules.parse(existing.businessRules).including(enrichment.businessRules)
                .values,
            ],
          }),
    }
  }

  private ui(incoming: UIComponent): UIComponent {
    if (this.state.type === 'UI') return this.state
    throw mismatch(this.state, incoming)
  }

  private api(incoming: APIComponent): APIComponent {
    if (this.state.type === 'API') return this.state
    throw mismatch(this.state, incoming)
  }

  private useCase(incoming: UseCaseComponent): UseCaseComponent {
    if (this.state.type === 'UseCase') return this.state
    throw mismatch(this.state, incoming)
  }

  private domainOp(incoming: DomainOpComponent): DomainOpComponent {
    if (this.state.type === 'DomainOp') return this.state
    throw mismatch(this.state, incoming)
  }

  private event(incoming: EventComponent): EventComponent {
    if (this.state.type === 'Event') return this.state
    throw mismatch(this.state, incoming)
  }

  private eventHandler(incoming: EventHandlerComponent): EventHandlerComponent {
    if (this.state.type === 'EventHandler') return this.state
    throw mismatch(this.state, incoming)
  }

  private custom(incoming: CustomComponent): CustomComponent {
    if (this.state.type === 'Custom') return this.state
    throw mismatch(this.state, incoming)
  }
}

function mergeUI(
  existing: UIComponent,
  incoming: UIComponent,
  preference: ExistingValuePreference,
  overwrites: ScalarOverwrite[],
): UIComponent {
  return {
    ...existing,
    route: scalar(existing.route, incoming.route, preference, 'route', overwrites),
    ...optionalDescription(existing, incoming, preference, overwrites),
    sourceLocation: preference.valueAfterUpdate(existing.sourceLocation, incoming.sourceLocation),
  }
}

function mergeAPI(
  existing: APIComponent,
  incoming: APIComponent,
  preference: ExistingValuePreference,
  overwrites: ScalarOverwrite[],
): APIComponent {
  const httpMethod = optionalScalar(
    existing.httpMethod,
    incoming.httpMethod,
    preference,
    'httpMethod',
    overwrites,
  )
  const path = optionalScalar(existing.path, incoming.path, preference, 'path', overwrites)
  const operationName = optionalScalar(
    existing.operationName,
    incoming.operationName,
    preference,
    'operationName',
    overwrites,
  )
  return {
    ...existing,
    apiType: scalar(existing.apiType, incoming.apiType, preference, 'apiType', overwrites),
    ...(httpMethod === undefined ? {} : { httpMethod }),
    ...(path === undefined ? {} : { path }),
    ...(operationName === undefined ? {} : { operationName }),
    ...optionalDescription(existing, incoming, preference, overwrites),
    sourceLocation: preference.valueAfterUpdate(existing.sourceLocation, incoming.sourceLocation),
  }
}

function mergeUseCase(
  existing: UseCaseComponent,
  incoming: UseCaseComponent,
  preference: ExistingValuePreference,
  overwrites: ScalarOverwrite[],
): UseCaseComponent {
  return {
    ...existing,
    ...optionalDescription(existing, incoming, preference, overwrites),
    sourceLocation: preference.valueAfterUpdate(existing.sourceLocation, incoming.sourceLocation),
  }
}

function mergeDomainOp(
  existing: DomainOpComponent,
  incoming: DomainOpComponent,
  preference: ExistingValuePreference,
  overwrites: ScalarOverwrite[],
): DomainOpComponent {
  const behavior =
    incoming.behavior === undefined
      ? existing.behavior
      : DomainOperationBehavior.parse(existing.behavior).including(incoming.behavior).value
  const stateChanges =
    incoming.stateChanges === undefined
      ? existing.stateChanges
      : StateTransitions.parse(existing.stateChanges).including(incoming.stateChanges).values
  const businessRules =
    incoming.businessRules === undefined
      ? existing.businessRules
      : BusinessRules.parse(existing.businessRules).including(incoming.businessRules).values
  const entity = optionalScalar(existing.entity, incoming.entity, preference, 'entity', overwrites)
  const signature = preference.valueAfterUpdate(existing.signature, incoming.signature)
  return {
    ...existing,
    operationName: scalar(
      existing.operationName,
      incoming.operationName,
      preference,
      'operationName',
      overwrites,
    ),
    ...(entity === undefined ? {} : { entity }),
    ...(signature === undefined ? {} : { signature }),
    ...(behavior === undefined ? {} : { behavior }),
    ...(stateChanges === undefined ? {} : { stateChanges: [...stateChanges] }),
    ...(businessRules === undefined ? {} : { businessRules: [...businessRules] }),
    ...optionalDescription(existing, incoming, preference, overwrites),
    sourceLocation: preference.valueAfterUpdate(existing.sourceLocation, incoming.sourceLocation),
  }
}

function mergeEvent(
  existing: EventComponent,
  incoming: EventComponent,
  preference: ExistingValuePreference,
  overwrites: ScalarOverwrite[],
): EventComponent {
  const eventSchema = optionalScalar(
    existing.eventSchema,
    incoming.eventSchema,
    preference,
    'eventSchema',
    overwrites,
  )
  return {
    ...existing,
    eventName: scalar(existing.eventName, incoming.eventName, preference, 'eventName', overwrites),
    ...(eventSchema === undefined ? {} : { eventSchema }),
    ...optionalDescription(existing, incoming, preference, overwrites),
    sourceLocation: preference.valueAfterUpdate(existing.sourceLocation, incoming.sourceLocation),
  }
}

function mergeEventHandler(
  existing: EventHandlerComponent,
  incoming: EventHandlerComponent,
  preference: ExistingValuePreference,
  overwrites: ScalarOverwrite[],
): EventHandlerComponent {
  const subscribedEvents = SubscribedEvents.parseValues(existing.subscribedEvents).including(
    incoming.subscribedEvents,
  )
  return {
    ...existing,
    subscribedEvents: [...subscribedEvents.values],
    ...optionalDescription(existing, incoming, preference, overwrites),
    sourceLocation: preference.valueAfterUpdate(existing.sourceLocation, incoming.sourceLocation),
  }
}

function mergeCustom(
  existing: CustomComponent,
  incoming: CustomComponent,
  incomingProperties: Readonly<Record<string, unknown>> | undefined,
  preference: ExistingValuePreference,
  overwrites: ScalarOverwrite[],
): CustomComponent {
  const combination = CustomComponentProperties.parse(existing).including(
    CustomComponentProperties.parse(incomingProperties),
    preference,
  )
  overwrites.push(...combination.replacements)
  const description = optionalScalar(
    existing.description,
    incoming.description,
    preference,
    'description',
    overwrites,
  )
  return {
    ...combination.properties.published(),
    id: existing.id,
    type: existing.type,
    name: existing.name,
    domain: existing.domain,
    module: existing.module,
    customTypeName: scalar(
      existing.customTypeName,
      incoming.customTypeName,
      preference,
      'customTypeName',
      overwrites,
    ),
    ...(description === undefined ? {} : { description }),
    sourceLocation: preference.valueAfterUpdate(existing.sourceLocation, incoming.sourceLocation),
  }
}

function scalar<T extends Primitive>(
  existing: T,
  incoming: T,
  preference: ExistingValuePreference,
  field: string,
  overwrites: ScalarOverwrite[],
): T {
  const selected = preference.valueAfterUpdate(existing, incoming)
  if (selected === incoming && existing !== incoming)
    overwrites.push({ field, oldValue: existing, newValue: incoming })
  return selected
}

function optionalScalar<T extends Primitive>(
  existing: T | undefined,
  incoming: T | undefined,
  preference: ExistingValuePreference,
  field: string,
  overwrites: ScalarOverwrite[],
): T | undefined {
  const selected = preference.valueAfterUpdate(existing, incoming)
  if (
    existing !== undefined &&
    incoming !== undefined &&
    selected === incoming &&
    existing !== incoming
  )
    overwrites.push({ field, oldValue: existing, newValue: incoming })
  return selected
}

function optionalDescription(
  existing: { readonly description?: string },
  incoming: { readonly description?: string },
  preference: ExistingValuePreference,
  overwrites: ScalarOverwrite[],
): Readonly<{ description?: string }> {
  const description = optionalScalar(
    existing.description,
    incoming.description,
    preference,
    'description',
    overwrites,
  )
  return description === undefined ? {} : { description }
}

function mismatch(
  existing: PublishedComponent,
  incoming: PublishedComponent,
): ComponentTypeMismatchError {
  return new ComponentTypeMismatchError(incoming.id, existing.type ?? 'unknown', incoming.type)
}
