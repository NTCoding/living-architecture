type WorkflowDefinitionFailureCode =
  | 'INVALID_WORKFLOW_NAME'
  | 'MISSING_EXTRACT_STAGE'
  | 'DUPLICATE_STAGE_NAME'
  | 'MISSING_LINK_STAGE'
  | 'MULTIPLE_LINK_STAGES'
  | 'MISSING_VALIDATE_STAGE'
  | 'MULTIPLE_VALIDATE_STAGES'
  | 'INVALID_STAGE_ORDER'

/** @riviere-role value-object */
export class WorkflowDefinitionFailure {
  declare private readonly brand: 'WorkflowDefinitionFailure'

  static parse(code: WorkflowDefinitionFailureCode, message: string): WorkflowDefinitionFailure {
    return new WorkflowDefinitionFailure(code, message)
  }

  private constructor(
    readonly code: WorkflowDefinitionFailureCode,
    readonly message: string,
  ) {}
}
