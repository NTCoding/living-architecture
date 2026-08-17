/** @riviere-role command-use-case-result */
export interface WorkflowCommandResult {
  readonly result: { readonly pass: true } | { readonly pass: false; readonly reason: string }
}
