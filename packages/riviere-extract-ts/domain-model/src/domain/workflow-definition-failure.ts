type WorkflowDefinitionFailureCode =
  | 'INVALID_WORKFLOW_NAME'
  | 'MISSING_WORKFLOW_STAGE'
  | 'DUPLICATE_STAGE_NAME'

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
