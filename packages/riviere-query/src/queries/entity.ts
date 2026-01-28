import type { DomainOpComponent } from '@living-architecture/riviere-schema'
import type {
  EntityName, DomainName, State, OperationName 
} from './branded-types'

export class Entity {
  constructor(
    public readonly name: EntityName,
    public readonly domain: DomainName,
    public readonly operations: DomainOpComponent[],
    public readonly states: State[],
    public readonly transitions: EntityTransition[],
    public readonly businessRules: string[],
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

export interface EntityTransition {
  from: State
  to: State
  triggeredBy: OperationName
}
