import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import type { DomainConcept } from './domain-guide-source'
import { annotatedDeclarations } from './typescript-invocation-support'
import { aggregateRepositoryReturns, inspectInvocations } from './use-case-invocations'

const packageName = '@example/orders-domain-model'
const domainConcepts = new Map<string, DomainConcept>([
  ['Order', { name: 'Order', role: 'aggregate' }],
  ['OrderPolicy', { name: 'OrderPolicy', role: 'domain-service' }],
  ['approveOrder', { name: 'approveOrder', role: 'domain-service' }],
])

class MissingTestUseCaseError extends Error {}

describe('use case invocations', () => {
  it('finds aggregate return types on annotated repositories', () => {
    const sourceFile = parse(`
      import type { Order, OrderPolicy } from '${packageName}'
      /** @riviere-role aggregate-repository */
      export class OrderRepository {
        load(): Promise<Order | undefined> { throw new Error() }
        noType() {}
        policy(): OrderPolicy { throw new Error() }
        field = 1
      }
      /** @riviere-role domain-service */ export class Ignore {}
      /** @riviere-role aggregate-repository */ export function notAClass(): void {}
    `)

    expect(aggregateRepositoryReturns([{ sourceFile }], packageName, domainConcepts)).toStrictEqual(
      new Map([['OrderRepository', new Map([['load', 'Order']])]]),
    )
  })

  it('finds typed, repository, helper, static and function invocations once', () => {
    const sourceFile = parse(`
      import { Order, OrderPolicy, approveOrder } from '${packageName}'

      interface Dependencies { repository: OrderRepository }
      class OrderRepository {}

      /** @riviere-role command-use-case */
      export class ConfirmOrder {
        constructor(
          private readonly repository: OrderRepository,
          private readonly policy: OrderPolicy,
          private readonly dependencies: Dependencies,
        ) {}

        execute(): void {
          const missing = undefined
          const nonCall = 1
          const element = values[0]()
          const order = this.repository.load()
          const other = loadOrder(this.repository)
          const opened = Order.open()
          const unknown = factory().load()
          this.policy.approve()
          this.policy.approve()
          order.confirm()
          other.cancel()
          opened.submit()
          approveOrder()
          unknown.ignore()
          missing?.ignore()
          nonCall.toString()
          element.ignore()
          helperWithoutReturn()
        }
      }

      function loadOrder(repository: OrderRepository): Order {
        return repository.load()
      }
      function helperWithoutReturn(): void { return }
      function unused(): Order { return Order.open() }
      function (): void {}
    `)
    const useCase = requiredUseCase(sourceFile, 'ConfirmOrder')
    const repositoryReturns = new Map([['OrderRepository', new Map([['load', 'Order']])]])

    expect(
      inspectInvocations(useCase, packageName, domainConcepts, repositoryReturns),
    ).toStrictEqual([
      { concept: 'Order', operation: 'open', role: 'aggregate' },
      { concept: 'OrderPolicy', operation: 'approve', role: 'domain-service' },
      { concept: 'Order', operation: 'confirm', role: 'aggregate' },
      { concept: 'Order', operation: 'cancel', role: 'aggregate' },
      { concept: 'Order', operation: 'submit', role: 'aggregate' },
      { concept: 'approveOrder', operation: 'approveOrder', role: 'domain-service' },
    ])
  })

  it('returns no invocations without a domain model package', () => {
    const sourceFile = parse(`
      /** @riviere-role query-model-use-case */
      export function ListOrders(): void { unknown(); value.method() }
    `)
    const useCase = requiredUseCase(sourceFile, 'ListOrders')

    expect(inspectInvocations(useCase, undefined, domainConcepts, new Map())).toStrictEqual([])
  })
})

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile('/workspace/use-case.ts', source, ts.ScriptTarget.Latest, true)
}

function requiredUseCase(
  sourceFile: ts.SourceFile,
  name: string,
): ReturnType<typeof annotatedDeclarations>[number] {
  const useCase = annotatedDeclarations([{ sourceFile }]).find((entry) => entry.name === name)
  if (useCase === undefined) throw new MissingTestUseCaseError(`Missing use case '${name}'.`)
  return useCase
}
