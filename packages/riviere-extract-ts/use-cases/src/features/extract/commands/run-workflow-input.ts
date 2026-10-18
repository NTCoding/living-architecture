/** @riviere-role command-use-case-input */
export interface RunWorkflowInput {
  readonly workflowPath: string
  readonly mode?: 'run' | 'skip-ai' | 'dry-run'
}
