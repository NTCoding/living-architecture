import { CommandFailed, RunCancelled } from './maintainer-git-errors.ts'
import type { PlannedCommand } from './maintainer-git-commands.ts'

export interface CommandOutcome {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

export async function runCommand(
  plan: PlannedCommand,
  signal: AbortSignal,
): Promise<CommandOutcome> {
  if (signal.aborted) {
    throw new RunCancelled(plan.executable)
  }
  const output = await new Deno.Command(plan.executable, {
    args: [...plan.args],
    stdout: 'piped',
    stderr: 'piped',
  }).output()
  const decoder = new TextDecoder()
  return {
    exitCode: output.code,
    stdout: decoder.decode(output.stdout).trim(),
    stderr: decoder.decode(output.stderr).trim(),
  }
}

export async function runOrThrow(
  plan: PlannedCommand,
  signal: AbortSignal,
  action: string,
): Promise<CommandOutcome> {
  const outcome = await runCommand(plan, signal)
  if (outcome.exitCode !== 0) {
    throw new CommandFailed(action, outcome.exitCode, outcome.stderr || outcome.stdout)
  }
  return outcome
}
