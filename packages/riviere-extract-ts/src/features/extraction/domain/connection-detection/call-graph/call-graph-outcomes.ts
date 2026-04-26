import type { EnrichedComponent } from '../../value-extraction/enriched-component'
import type { MethodDeclaration } from 'ts-morph'

/** @riviere-role value-object */
export class InterfaceResolutionOutcome {
  declare private brand: 'InterfaceResolutionOutcome'
  readonly component: EnrichedComponent | undefined
  readonly resolvedTypeName: string | undefined
  readonly uncertain: string | undefined

  constructor(params: {
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

  constructor(params: {
    method: MethodDeclaration | undefined;
    classFound: boolean 
  }) {
    this.method = params.method
    this.classFound = params.classFound
  }
}
