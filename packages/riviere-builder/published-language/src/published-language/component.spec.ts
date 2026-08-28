import type {
  APIComponent,
  CustomComponent,
  DomainOpComponent,
  EventComponent,
  EventHandlerComponent,
  UIComponent,
  UseCaseComponent,
} from '@living-architecture/riviere-schema-published-language/schema'
import { Component } from './component'
import { ComponentTypeMismatchError } from './construction-errors'
import { ExistingValuePreference } from './existing-value-preference'

const sourceLocation = { repository: 'test/repo', filePath: 'src/component.ts' }
const preference = ExistingValuePreference.parse(false)

function ui(id = 'orders:checkout:ui:component'): UIComponent {
  return {
    id,
    type: 'UI',
    name: 'Component',
    domain: 'orders',
    module: 'checkout',
    route: '/orders',
    sourceLocation,
  }
}

function api(): APIComponent {
  return {
    id: 'orders:checkout:api:component',
    type: 'API',
    name: 'Component',
    domain: 'orders',
    module: 'checkout',
    apiType: 'GraphQL',
    sourceLocation,
  }
}

function useCase(): UseCaseComponent {
  return {
    id: 'orders:checkout:usecase:component',
    type: 'UseCase',
    name: 'Component',
    domain: 'orders',
    module: 'checkout',
    sourceLocation,
  }
}

function domainOperation(): DomainOpComponent {
  return {
    id: 'orders:checkout:domainop:component',
    type: 'DomainOp',
    name: 'Component',
    domain: 'orders',
    module: 'checkout',
    operationName: 'execute',
    sourceLocation,
  }
}

function event(): EventComponent {
  return {
    id: 'orders:checkout:event:component',
    type: 'Event',
    name: 'Component',
    domain: 'orders',
    module: 'checkout',
    eventName: 'Executed',
    sourceLocation,
  }
}

function eventHandler(): EventHandlerComponent {
  return {
    id: 'orders:checkout:eventhandler:component',
    type: 'EventHandler',
    name: 'Component',
    domain: 'orders',
    module: 'checkout',
    subscribedEvents: [],
    sourceLocation,
  }
}

function custom(): CustomComponent {
  return {
    id: 'orders:checkout:custom:component',
    type: 'Custom',
    name: 'Component',
    domain: 'orders',
    module: 'checkout',
    customTypeName: 'Queue',
    sourceLocation,
  }
}

describe('Component', () => {
  it('rejects API, UseCase, and DomainOp updates whose type differs', () => {
    expect(() => Component.fromState(ui(api().id)).update(api(), preference)).toThrow(
      ComponentTypeMismatchError,
    )
    expect(() => Component.fromState(ui(useCase().id)).update(useCase(), preference)).toThrow(
      ComponentTypeMismatchError,
    )
    expect(() =>
      Component.fromState(ui(domainOperation().id)).update(domainOperation(), preference),
    ).toThrow(ComponentTypeMismatchError)
  })

  it('rejects Event, EventHandler, and Custom updates whose type differs', () => {
    expect(() => Component.fromState(ui(event().id)).update(event(), preference)).toThrow(
      ComponentTypeMismatchError,
    )
    expect(() =>
      Component.fromState(ui(eventHandler().id)).update(eventHandler(), preference),
    ).toThrow(ComponentTypeMismatchError)
    expect(() => Component.fromState(ui(custom().id)).update(custom(), preference)).toThrow(
      ComponentTypeMismatchError,
    )
  })

  it('keeps absent optional values absent during updates', () => {
    expect(Component.fromState(api()).update(api(), preference).component).toStrictEqual(api())
    expect(
      Component.fromState(domainOperation()).update(domainOperation(), preference).component,
    ).toStrictEqual(domainOperation())
    expect(Component.fromState(event()).update(event(), preference).component).toStrictEqual(
      event(),
    )
    expect(Component.fromState(custom()).update(custom(), preference).component).toStrictEqual(
      custom(),
    )
  })

  it('keeps supplied optional values during updates', () => {
    const apiWithOptionalValues: APIComponent = {
      ...api(),
      httpMethod: 'POST',
      path: '/orders',
      operationName: 'placeOrder',
    }
    const domainOperationWithOptionalValues: DomainOpComponent = {
      ...domainOperation(),
      entity: 'Order',
      signature: { returnType: 'Order' },
    }
    const eventWithSchema: EventComponent = { ...event(), eventSchema: '{}' }
    const customWithDescription: CustomComponent = {
      ...custom(),
      description: 'Order queue',
    }

    expect(
      Component.fromState(apiWithOptionalValues).update(apiWithOptionalValues, preference)
        .component,
    ).toStrictEqual(apiWithOptionalValues)
    expect(
      Component.fromState(domainOperationWithOptionalValues).update(
        domainOperationWithOptionalValues,
        preference,
      ).component,
    ).toStrictEqual(domainOperationWithOptionalValues)
    expect(
      Component.fromState(eventWithSchema).update(eventWithSchema, preference).component,
    ).toStrictEqual(eventWithSchema)
    expect(
      Component.fromState(customWithDescription).update(customWithDescription, preference)
        .component,
    ).toStrictEqual(customWithDescription)
  })
})
