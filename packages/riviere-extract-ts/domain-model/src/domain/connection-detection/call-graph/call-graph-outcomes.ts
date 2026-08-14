import type { MethodDeclaration } from 'ts-morph'
import type { EnrichedComponent } from '../../value-extraction/enriched-component'

/** @riviere-role value-object */
export class InterfaceResolutionOutcome {
  declare private brand: 'InterfaceResolutionOutcome'
  readonly component: EnrichedComponent | undefined
  readonly resolvedTypeName: string | undefined
  readonly uncertain: string | undefined

  static parse(params: {
    component: EnrichedComponent | undefined
    resolvedTypeName: string | undefined
    uncertain: string | undefined
  }): InterfaceResolutionOutcome {
    return new InterfaceResolutionOutcome(params)
  }

  private constructor(params: {
    component: EnrichedComponent | undefined
    resolvedTypeName: string | undefined
    uncertain: string | undefined
  }) {
    this.component = params.component
    this.resolvedTypeName = params.resolvedTypeName
    this.uncertain = params.uncertain
  }
}

/** @riviere-role value-object */
export class MethodLookup {
  declare private brand: 'MethodLookup'
  readonly method: MethodDeclaration | undefined
  readonly classFound: boolean

  static parse(params: {
    method: MethodDeclaration | undefined
    classFound: boolean
  }): MethodLookup {
    return new MethodLookup(params)
  }

  private constructor(params: { method: MethodDeclaration | undefined; classFound: boolean }) {
    this.method = params.method
    this.classFound = params.classFound
  }
}
