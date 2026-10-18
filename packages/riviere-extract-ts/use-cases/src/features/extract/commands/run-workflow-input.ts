/** @riviere-role command-use-case-input */
export interface RunWorkflowInput {
  readonly workflowPath: string
  readonly mode?: string
  readonly skipAi?: boolean
  readonly dryRun?: boolean
}
