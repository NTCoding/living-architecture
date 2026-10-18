import { spawn } from 'node:child_process'

/** @riviere-role external-client-model */
export type ChildProcessCommandAvailability =
  | Readonly<{
      readonly kind: 'available'
      readonly command: string
    }>
  | Readonly<{
      readonly kind: 'unavailable'
      readonly command: string
      readonly reason: string
    }>

const AVAILABILITY_TIMEOUT_MILLISECONDS = 5_000

/** @riviere-role external-client-service */
export class ChildProcessClient {
  checkCommand(command: string): Promise<ChildProcessCommandAvailability> {
    return new Promise((resolve) => {
      const probe = this.spawnProbe(command, resolve)
      if (probe === undefined) return
      const runState = { settled: false }
      const finish = (availability: ChildProcessCommandAvailability): void => {
        if (runState.settled) return
        runState.settled = true
        resolve(availability)
      }
      const timer = setTimeout(() => {
        probe.kill('SIGKILL')
        finish({
          kind: 'unavailable',
          command,
          reason: `Command '${command}' timed out after ${AVAILABILITY_TIMEOUT_MILLISECONDS}ms`,
        })
      }, AVAILABILITY_TIMEOUT_MILLISECONDS)
      probe.on('error', (error) => finish({ kind: 'unavailable', command, reason: String(error) }))
      probe.on('close', (exitCode, signal) => {
        clearTimeout(timer)
        if (exitCode === 0) {
          finish({ kind: 'available', command })
          return
        }
        finish({
          kind: 'unavailable',
          command,
          reason: unavailableReason(command, exitCode, signal),
        })
      })
    })
  }

  private spawnProbe(
    command: string,
    resolve: (availability: ChildProcessCommandAvailability) => void,
  ): ReturnType<typeof spawn> | undefined {
    try {
      return spawn(command, ['--version'], {
        shell: false,
        env: process.env,
        stdio: 'ignore',
      })
    } catch (error) {
      resolve({ kind: 'unavailable', command, reason: String(error) })
      return undefined
    }
  }
}

function unavailableReason(
  command: string,
  exitCode: number | null,
  signal: string | null,
): string {
  if (exitCode !== null) return `Command '${command}' exited with code ${exitCode}`
  return `Command '${command}' terminated by signal '${String(signal)}'`
}
