import { spawnSync } from 'node:child_process'

const ACP_REVIEW_BATCH_TIMEOUT_MS = 7 * 60 * 1000

/** @riviere-role external-client-model */
export type AcpReviewerProvider = 'claude' | 'codex' | 'opencode' | 'pi'

/** @riviere-role external-client-model */
export type AcpClientOptions = {
  readonly workerPath: string
  readonly provider: AcpReviewerProvider
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

function providerCommand(provider: AcpReviewerProvider): {
  readonly command: string
  readonly args: readonly string[]
} {
  switch (provider) {
    case 'claude':
      return { command: 'npx', args: ['-y', '@agentclientprotocol/claude-agent-acp'] }
    case 'codex':
      return { command: 'npx', args: ['-y', '@agentclientprotocol/codex-acp'] }
    case 'opencode':
      return { command: 'opencode', args: ['acp'] }
    case 'pi':
      return { command: 'npx', args: ['-y', 'pi-acp'] }
  }
}

/** @riviere-role external-client-service */
export class AcpClient {
  private readonly options: AcpClientOptions

  constructor(options: AcpClientOptions) {
    this.options = options
  }

  run(sessions: readonly AcpSessionRequest[]): void {
    const result = spawnSync(process.execPath, [this.options.workerPath], {
      cwd: this.options.cwd,
      env: process.env,
      input: JSON.stringify({
        sessions,
        ...providerCommand(this.options.provider),
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
