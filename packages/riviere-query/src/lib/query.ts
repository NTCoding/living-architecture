import Ajv, { type ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import type { RiviereGraph, Component, Link } from '@living-architecture/riviere-schema'
import rawSchema from '@living-architecture/riviere-schema/schema.json' with { type: 'json' }

export type ValidationErrorCode = 'SCHEMA_ERROR' | 'INVALID_LINK_SOURCE' | 'INVALID_LINK_TARGET'

export interface ValidationError {
  path: string
  message: string
  code: ValidationErrorCode
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

interface AjvErrorWithMessage extends ErrorObject {
  message: string
}

export function hasMessage(err: ErrorObject): err is AjvErrorWithMessage {
  return err.message !== undefined
}

export function toValidationError(err: ErrorObject): ValidationError {
  if (!hasMessage(err)) {
    throw new Error(`ajv error missing message: ${JSON.stringify(err)}`)
  }
  return {
    path: err.instancePath === '' ? '/' : err.instancePath,
    message: err.message,
    code: 'SCHEMA_ERROR',
  }
}

export class RiviereQuery {
  private readonly graph: RiviereGraph

  constructor(graph: RiviereGraph) {
    this.graph = graph
  }

  components(): Component[] {
    return this.graph.components
  }

  links(): Link[] {
    return this.graph.links
  }

  validate(): ValidationResult {
    const errors: ValidationError[] = []

    const ajv = new Ajv.default({ allErrors: true })
    addFormats.default(ajv)

    const validate = ajv.compile(rawSchema)
    const valid = validate(this.graph)

    if (!valid && validate.errors) {
      errors.push(...validate.errors.map(toValidationError))
      return { valid: false, errors }
    }

    const componentIds = new Set(this.graph.components.map((c) => c.id))
    this.graph.links.forEach((link, index) => {
      if (!componentIds.has(link.source)) {
        errors.push({
          path: `/links/${index}/source`,
          message: `Link references non-existent source: ${link.source}`,
          code: 'INVALID_LINK_SOURCE',
        })
      }
      if (!componentIds.has(link.target)) {
        errors.push({
          path: `/links/${index}/target`,
          message: `Link references non-existent target: ${link.target}`,
          code: 'INVALID_LINK_TARGET',
        })
      }
    })

    return { valid: errors.length === 0, errors }
  }

  detectOrphans(): string[] {
    const connectedComponentIds = this.buildConnectedComponentIds()
    return this.graph.components
      .filter((c) => !connectedComponentIds.has(c.id))
      .map((c) => c.id)
  }

  private buildConnectedComponentIds(): Set<string> {
    const connected = new Set<string>()
    this.graph.links.forEach((link) => {
      connected.add(link.source)
      connected.add(link.target)
    })
    return connected
  }
}
