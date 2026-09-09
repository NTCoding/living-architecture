import { spawnSync } from 'node:child_process'
import type {
  ReviewAgentName,
  ReviewLaunchRequest,
  ReviewLauncher,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/ports/review-launcher'

export type AcpReviewerLauncherOptions = {
  readonly workerPath: string
  readonly command: string
  readonly args?: readonly string[]
  readonly cwd: string
}

class AcpReviewerProcessError extends Error {}

/** @riviere-role infrastructure-adapter */
export class AcpReviewerLauncher implements ReviewLauncher {
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

export function isReviewAgentName(value: string): value is ReviewAgentName {
  return (
    value === 'architecture-review' ||
    value === 'code-review' ||
    value === 'bug-scanner' ||
    value === 'task-check'
  )
}
