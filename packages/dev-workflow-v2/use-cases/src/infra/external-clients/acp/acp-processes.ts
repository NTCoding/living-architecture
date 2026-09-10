import type { ChildProcess } from 'node:child_process'

/** @riviere-role external-client-service */
export function stopAcpProcesses(processes: ReadonlySet<ChildProcess>): void {
  for (const acpProcess of processes) acpProcess.kill('SIGTERM')
}
