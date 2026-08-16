/** @riviere-role external-client-error */
export class WorkspacePackagePatternsError extends Error {
  constructor() {
    super("pnpm-workspace.yaml must contain a 'packages' array of paths.")
    this.name = 'WorkspacePackagePatternsError'
  }
}
