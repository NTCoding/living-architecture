// Swamp audit extension for Pi
// Records bash tool invocations for the swamp audit timeline.
// This is a managed file — it will be overwritten on swamp upgrade.

import { spawn } from 'node:child_process'

const pendingCommands = new Map()

export default function swampAudit(pi) {
  pi.on('tool_call', async (event, ctx) => {
    if (event.tool !== 'bash') return
    const command = event.input?.command
    if (command && ctx.sessionId) {
      pendingCommands.set(ctx.sessionId, command)
    }
  })

  pi.on('tool_result', async (event, ctx) => {
    if (event.tool !== 'bash') return
    const command = pendingCommands.get(ctx.sessionId)
    pendingCommands.delete(ctx.sessionId)
    if (!command) return

    try {
      const payload = JSON.stringify({
        tool_name: 'bash',
        tool_input: { command },
        cwd: ctx.cwd || '.',
        session_id: ctx.sessionId,
      })
      const proc = spawn('swamp', ['audit', 'record', '--from-hook', '--tool', 'pi'], {
        stdio: ['pipe', 'ignore', 'ignore'],
      })
      proc.on('error', () => {})
      proc.stdin.end(payload)
    } catch {
      // Must never throw — this is a hook
    }
  })
}
