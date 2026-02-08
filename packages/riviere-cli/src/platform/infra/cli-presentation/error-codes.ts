export enum ExitCode {
  ExtractionFailure = 1,
  ConfigValidation = 2,
  RuntimeError = 3,
}

export class ExtractionFieldFailureError extends Error {
  constructor(failedFields: string[]) {
    const uniqueFields = [...new Set(failedFields)]
    super(`Extraction failed for fields: ${uniqueFields.join(', ')}`)
    this.name = 'ExtractionFieldFailureError'
  }
}

export class ConfigValidationError extends Error {
  readonly errorCode: CliErrorCode

  constructor(code: CliErrorCode, message: string) {
    super(message)
    this.name = 'ConfigValidationError'
    this.errorCode = code
  }
}

export enum CliErrorCode {
  GraphNotFound = 'GRAPH_NOT_FOUND',
  ComponentNotFound = 'COMPONENT_NOT_FOUND',
  DomainNotFound = 'DOMAIN_NOT_FOUND',
  CustomTypeNotFound = 'CUSTOM_TYPE_NOT_FOUND',
  DuplicateComponent = 'DUPLICATE_COMPONENT',
  DuplicateDomain = 'DUPLICATE_DOMAIN',
  InvalidLink = 'INVALID_LINK',
  InvalidComponentType = 'INVALID_COMPONENT_TYPE',
  ValidationError = 'VALIDATION_ERROR',
  GraphCorrupted = 'GRAPH_CORRUPTED',
  GraphExists = 'GRAPH_EXISTS',
  AmbiguousApiMatch = 'AMBIGUOUS_API_MATCH',
  ConfigNotFound = 'CONFIG_NOT_FOUND',
  GitNotARepository = 'GIT_NOT_A_REPOSITORY',
  GitNotFound = 'GIT_NOT_FOUND',
  ConnectionDetectionFailure = 'CONNECTION_DETECTION_FAILURE',
}
