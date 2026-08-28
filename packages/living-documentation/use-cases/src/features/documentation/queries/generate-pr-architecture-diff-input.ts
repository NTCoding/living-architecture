/** @riviere-role query-model-use-case-input */
export interface GeneratePullRequestArchitectureDiffInput {
  readonly baseWorkspaceRoot: string
  readonly headWorkspaceRoot: string
  readonly outputPath: string
}
