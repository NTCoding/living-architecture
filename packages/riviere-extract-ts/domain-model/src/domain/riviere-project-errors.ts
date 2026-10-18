/** @riviere-role domain-error */
export class ExtractionConfigurationUnavailableError extends Error {
  constructor() {
    super('Extraction configuration is unavailable for this project operation')
  }
}

/** @riviere-role domain-error */
export class GraphStateUnavailableError extends Error {
  constructor() {
    super('Graph state is unavailable for this project operation')
  }
}

/** @riviere-role domain-error */
export class InvalidWorkflowDefinitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidWorkflowDefinitionError'
  }
}

/** @riviere-role domain-error */
export class WorkflowUnavailableError extends Error {
  constructor() {
    super('Workflow is unavailable for this project operation')
    this.name = 'WorkflowUnavailableError'
  }
}
