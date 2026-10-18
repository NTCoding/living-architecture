/** @riviere-role command-use-case-result */
export interface ValidateWorkflowResult {
  readonly result:
    | Readonly<{ success: true }>
    | Readonly<{ success: false; errorCode: string; reason: string }>
}
