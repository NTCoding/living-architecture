import { createLinkId } from '@living-architecture/riviere-schema'
import type {
  RiviereGraph, CustomComponent 
} from '@living-architecture/riviere-schema'
import type {
  ComponentId, ValidationError, ValidationResult 
} from './domain-types'
import { parseComponentId } from './domain-types'

function isCustomComponent(component: { type: string }): component is CustomComponent {
  return component.type === 'Custom'
}

/** @riviere-role query-model */
export function validateGraph(graph: RiviereGraph): ValidationResult {
  const errors: ValidationError[] = []

  const componentIds = new Set(graph.components.map((c) => c.id))
  graph.links.forEach((link, index) => {
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

  errors.push(...validateCustomTypes(graph))
  errors.push(...validateRelationshipTypes(graph))
  errors.push(...validateUniqueLinkIds(graph))
  errors.push(...validateUniqueLinkOccurrences(graph))

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validateRelationshipTypes(graph: RiviereGraph): ValidationError[] {
  const errors: ValidationError[] = []
  const relationshipTypes = graph.metadata.relationshipTypes

  graph.links.forEach((link, index) => {
    if (
      link.relationshipType !== undefined &&
      (relationshipTypes === undefined || !(link.relationshipType in relationshipTypes))
    ) {
      errors.push({
        path: `/links/${index}/relationshipType`,
        message: `Relationship type '${link.relationshipType}' is not defined in metadata.relationshipTypes`,
        code: 'INVALID_RELATIONSHIP_TYPE',
      })
    }
  })

  return errors
}

function validateUniqueLinkIds(graph: RiviereGraph): ValidationError[] {
  const errors: ValidationError[] = []
  const seen = new Set<string>()

  graph.links.forEach((link, index) => {
    if (link.id === undefined) {
      return
    }
    if (seen.has(link.id)) {
      errors.push({
        path: `/links/${index}/id`,
        message: `Duplicate Link ID: ${link.id}`,
        code: 'DUPLICATE_LINK_ID',
      })
      return
    }
    seen.add(link.id)
  })

  return errors
}

function validateUniqueLinkOccurrences(graph: RiviereGraph): ValidationError[] {
  const errors: ValidationError[] = []
  const seen = new Set<string>()

  graph.links.forEach((link, index) => {
    const occurrenceId = createLinkId(link)
    if (seen.has(occurrenceId)) {
      errors.push({
        path: `/links/${index}`,
        message: `Duplicate Link occurrence: ${occurrenceId}`,
        code: 'DUPLICATE_LINK',
      })
      return
    }
    seen.add(occurrenceId)
  })

  return errors
}

function validateCustomTypes(graph: RiviereGraph): ValidationError[] {
  const errors: ValidationError[] = []
  const customTypes = graph.metadata.customTypes

  graph.components.forEach((component, index) => {
    if (!isCustomComponent(component)) {
      return
    }

    const customTypeName = component.customTypeName

    if (!customTypes || !(customTypeName in customTypes)) {
      errors.push({
        path: `/components/${index}/customTypeName`,
        message: `Custom type '${customTypeName}' is not defined in metadata.customTypes`,
        code: 'INVALID_TYPE',
      })
    }
  })

  return errors
}

/** @riviere-role query-model */
export function detectOrphanComponents(graph: RiviereGraph): ComponentId[] {
  const connectedComponentIds = new Set<string>()
  graph.links.forEach((link) => {
    connectedComponentIds.add(link.source)
    connectedComponentIds.add(link.target)
  })

  return graph.components
    .filter((c) => !connectedComponentIds.has(c.id))
    .map((c) => parseComponentId(c.id))
}
