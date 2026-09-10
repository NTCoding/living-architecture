import { z } from 'zod'
import type { ChildProcess } from 'node:child_process'
import { stopAcpProcesses } from './acp-processes'
import { runAcpSession } from './acp-session'

const inputSchema = z.object({
  command: z.string(),
  args: z.array(z.string()),
  sessions: z.array(z.object({ prompt: z.string() })),
})

/** @riviere-role external-client-service */
export function registerAcpTerminationHandler(
  processes: ReadonlySet<ChildProcess>,
  register: (listener: () => void) => void,
  exit: (code: number) => never,
): void {
  register(() => {
    stopAcpProcesses(processes)
    exit(1)
  })
}

/** @riviere-role external-client-service */
export async function runAcpClientWorker(
  input: unknown,
  cwd: string,
  registerTerminationHandler: (processes: ReadonlySet<ChildProcess>) => void,
): Promise<void> {
  const parsed = inputSchema.parse(input)
  const processes = new Set<ChildProcess>()
  registerTerminationHandler(processes)
  await Promise.all(
    parsed.sessions.map((session) =>
      runAcpSession(session, {
        command: parsed.command,
        args: parsed.args,
        cwd,
        onSpawned: (acpProcess) => processes.add(acpProcess),
      }),
    ),
  )
}
