/** @riviere-role command-use-case-result */
export type WorkflowCommandResult =
  | { readonly pass: true }
  | { readonly pass: false; readonly reason: string }
