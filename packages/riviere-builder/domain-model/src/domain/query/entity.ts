import type { DomainOpComponent } from '@living-architecture/riviere-schema-published-language/schema'
import type { DomainName } from './domain-name'
import type { EntityName } from './entity-name'
import { EntityTransition } from './entity-transition'
import type { State } from './state'

/** @riviere-role value-object */
export class Entity {
  declare private readonly brand: 'Entity'

  static parse(
    name: EntityName,
    domain: DomainName,
    operations: readonly DomainOpComponent[],
    states: readonly State[],
    transitions: readonly EntityTransition[],
    businessRules: readonly string[],
  ): Entity {
    return new Entity(name, domain, operations, states, transitions, businessRules)
  }

  private constructor(
    public readonly name: EntityName,
    public readonly domain: DomainName,
    public readonly operations: readonly DomainOpComponent[],
    public readonly states: readonly State[],
    public readonly transitions: readonly EntityTransition[],
    public readonly businessRules: readonly string[],
  ) {}

  hasStates(): boolean {
    return this.states.length > 0
  }

  hasBusinessRules(): boolean {
    return this.businessRules.length > 0
  }

  firstOperationId(): string | undefined {
    return this.operations[0]?.id
  }
}
