export { RiviereBuilder } from './domain/riviere-builder'
export { ComponentId } from '@living-architecture/riviere-schema-published-language/component-id'
export {
  BuildValidationError,
  ComponentNotFoundError,
  ComponentTypeMismatchError,
  CustomTypeAlreadyDefinedError,
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
  DuplicateDomainError,
  DuplicateLinkError,
  InvalidGraphError,
  MissingDomainsError,
  MissingRequiredPropertiesError,
  MissingSourcesError,
  RelationshipTypeAlreadyDefinedError,
  RelationshipTypeNotFoundError,
  SourceConflictError,
} from './domain/construction/construction-errors'
export { InvalidEnrichmentTargetError } from './domain/enrichment/enrichment-errors'
export { findNearMatches } from './domain/error-recovery/component-suggestion'
export { RiviereQuery } from './domain/query/RiviereQuery'
