import { spawnSync } from 'node:child_process'

type AcpReviewerLauncherOptions = {
  readonly workerPath: string
  readonly command: string
  readonly args?: readonly string[]
  readonly cwd: string
}

class AcpReviewerProcessError extends Error {}

type ReviewLaunchRequest = {
  readonly pullRequestNumber: number
  readonly reviewer: 'architecture-review' | 'code-review' | 'bug-scanner' | 'task-check'
  readonly workflowState: unknown
}

/** @riviere-role external-client-service */
export class AcpReviewerLauncher {
  private readonly options: AcpReviewerLauncherOptions

  constructor(options: AcpReviewerLauncherOptions) {
    this.options = options
  }

  run(requests: readonly ReviewLaunchRequest[]): void {
    const result = spawnSync(process.execPath, [this.options.workerPath], {
      cwd: this.options.cwd,
      env: process.env,
      input: JSON.stringify({
          requests,
        command: this.options.command,
        args: this.options.args ?? [],
      }),
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    })
    if (result.error !== undefined) throw new AcpReviewerProcessError(result.error.message)
    if (result.status !== 0)
      throw new AcpReviewerProcessError(
        `ACP reviewer exited with status ${String(result.status)}: ${result.stderr}`,
      )
  }
}
