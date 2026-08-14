import type { CustomComponent, RiviereGraph } from './schema'
import { LinkId } from './link-id'

type ValidationErrorCode =
  | 'INVALID_LINK_SOURCE'
  | 'INVALID_LINK_TARGET'
  | 'INVALID_TYPE'
  | 'INVALID_RELATIONSHIP_TYPE'
  | 'DUPLICATE_LINK_ID'
  | 'DUPLICATE_LINK'

/** @riviere-role value-object */
export class ValidationError {
  declare private readonly brand: 'ValidationError'

  private constructor(
    readonly path: string,
    readonly message: string,
    readonly code: ValidationErrorCode,
  ) {}

  static parse(input: {
    readonly path: string
    readonly message: string
    readonly code: ValidationErrorCode
  }): ValidationError {
    return new ValidationError(input.path, input.message, input.code)
  }
}

/** @riviere-role value-object */
export class ValidationResult {
  declare private readonly brand: 'ValidationResult'

  private constructor(
    readonly valid: boolean,
    readonly errors: readonly ValidationError[],
  ) {}

  static parse(graph: RiviereGraph): ValidationResult {
    const errors = validateLinks(graph)
    errors.push(...validateCustomTypes(graph))
    errors.push(...validateRelationshipTypes(graph))
    errors.push(...validateUniqueLinkIds(graph))
    errors.push(...validateUniqueLinkOccurrences(graph))
    return new ValidationResult(errors.length === 0, errors)
  }
}

function validateLinks(graph: RiviereGraph): ValidationError[] {
  const errors: ValidationError[] = []
  const componentIds = new Set(graph.components.map((component) => component.id))
  graph.links.forEach((link, index) => {
    if (!componentIds.has(link.source)) {
      errors.push(linkReferenceError(index, 'source', link.source, 'INVALID_LINK_SOURCE'))
    }
    if (!componentIds.has(link.target)) {
      errors.push(linkReferenceError(index, 'target', link.target, 'INVALID_LINK_TARGET'))
    }
  })
  return errors
}

function linkReferenceError(
  index: number,
  end: 'source' | 'target',
  componentId: string,
  code: 'INVALID_LINK_SOURCE' | 'INVALID_LINK_TARGET',
): ValidationError {
  return ValidationError.parse({
    path: `/links/${index}/${end}`,
    message: `Link references non-existent ${end}: ${componentId}`,
    code,
  })
}

function validateCustomTypes(graph: RiviereGraph): ValidationError[] {
  const customTypes = graph.metadata.customTypes
  return graph.components.flatMap((component, index) => {
    if (!isCustomComponent(component) || (customTypes && component.customTypeName in customTypes)) {
      return []
    }
    return [
      ValidationError.parse({
        path: `/components/${index}/customTypeName`,
        message: `Custom type '${component.customTypeName}' is not defined in metadata.customTypes`,
        code: 'INVALID_TYPE',
      }),
    ]
  })
}

function isCustomComponent(component: { type: string }): component is CustomComponent {
  return component.type === 'Custom'
}

function validateRelationshipTypes(graph: RiviereGraph): ValidationError[] {
  const relationshipTypes = graph.metadata.relationshipTypes
  return graph.links.flatMap((link, index) => {
    if (
      link.relationshipType === undefined ||
      (relationshipTypes && Object.hasOwn(relationshipTypes, link.relationshipType))
    ) {
      return []
    }
    return [
      ValidationError.parse({
        path: `/links/${index}/relationshipType`,
        message: `Relationship type '${link.relationshipType}' is not defined in metadata.relationshipTypes`,
        code: 'INVALID_RELATIONSHIP_TYPE',
      }),
    ]
  })
}

function validateUniqueLinkIds(graph: RiviereGraph): ValidationError[] {
  const errors: ValidationError[] = []
  const seen = new Set<string>()
  graph.links.forEach((link, index) => {
    if (link.id === undefined) return
    if (seen.has(link.id)) {
      errors.push(
        ValidationError.parse({
          path: `/links/${index}/id`,
          message: `Duplicate Link ID: ${link.id}`,
          code: 'DUPLICATE_LINK_ID',
        }),
      )
    }
    seen.add(link.id)
  })
  return errors
}

function validateUniqueLinkOccurrences(graph: RiviereGraph): ValidationError[] {
  const errors: ValidationError[] = []
  const seen = new Set<string>()
  graph.links.forEach((link, index) => {
    const occurrenceId = LinkId.parseFromLink(link).toString()
    if (seen.has(occurrenceId)) {
      errors.push(
        ValidationError.parse({
          path: `/links/${index}`,
          message: `Duplicate Link occurrence: ${occurrenceId}`,
          code: 'DUPLICATE_LINK',
        }),
      )
    }
    seen.add(occurrenceId)
  })
  return errors
}
