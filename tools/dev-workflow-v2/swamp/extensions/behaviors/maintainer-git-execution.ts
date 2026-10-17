import { CommandFailed, RunCancelled } from './maintainer-git-errors.ts'
import type { PlannedCommand } from './maintainer-git-commands.ts'

/**
 * Running a planned command, and the failure behaviour shared by every method.
 *
 * A command never receives a single string of shell text. The executable and
 * each argument are separate, so nothing the agent records can be split into
 * extra arguments by a shell.
 */

/** What a command produced, with both streams already decoded. */
export interface CommandOutcome {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

/** Runs a command and returns its exit code and output. */
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

/** Runs a command and throws when it fails, naming the action that failed. */
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
