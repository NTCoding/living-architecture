import type { RiviereGraph } from '@living-architecture/riviere-schema'
import type { ComponentId } from './branded-types'
import type { ValidationResult } from './validation-types'
import {
  validateGraph, detectOrphanComponents 
} from './graph-validation'

export class ValidationQueries {
  constructor(private readonly graph: RiviereGraph) {}

  validate(): ValidationResult {
    return validateGraph(this.graph)
  }

  detectOrphans(): ComponentId[] {
    return detectOrphanComponents(this.graph)
  }
}
