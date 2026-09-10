import { spawnSync } from 'node:child_process'

const ACP_REVIEW_BATCH_TIMEOUT_MS = 7 * 60 * 1000

/** @riviere-role external-client-model */
export type AcpClientOptions = {
  readonly workerPath: string
  readonly command: string | undefined
  readonly args?: readonly string[]
  readonly cwd: string
}

/** @riviere-role external-client-model */
export type AcpSessionRequest = {
  readonly prompt: string
}

/** @riviere-role external-client-error */
export class AcpClientError extends Error {}

/** @riviere-role external-client-error */
export class AcpClientTimeoutError extends Error {}

/** @riviere-role external-client-service */
export class AcpClient {
  private readonly options: AcpClientOptions

  constructor(options: AcpClientOptions) {
    this.options = options
  }

  run(sessions: readonly AcpSessionRequest[]): void {
    if (this.options.command === undefined || this.options.command === '') {
      throw new AcpClientError(
        'ACP_REVIEWER_COMMAND must be set to an ACP-compatible reviewer executable.',
      )
    }
    const result = spawnSync(process.execPath, [this.options.workerPath], {
      cwd: this.options.cwd,
      env: process.env,
      input: JSON.stringify({
        sessions,
        command: this.options.command,
        args: this.options.args ?? [],
      }),
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
      timeout: ACP_REVIEW_BATCH_TIMEOUT_MS,
      killSignal: 'SIGTERM',
    })
    if (result.error !== undefined) {
      const processError: NodeJS.ErrnoException = result.error
      if (processError.code === 'ETIMEDOUT')
        throw new AcpClientTimeoutError('ACP review batch exceeded its seven minute deadline.')
      throw new AcpClientError(processError.message)
    }
    if (result.status !== 0)
      throw new AcpClientError(
        `ACP client exited with status ${String(result.status)}: ${result.stderr}`,
      )
  }
}
