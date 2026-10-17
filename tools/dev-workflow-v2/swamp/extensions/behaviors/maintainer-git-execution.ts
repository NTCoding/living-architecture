import { CommandFailed, RunCancelled } from './maintainer-git-errors.ts'
import type { PlannedCommand } from './maintainer-git-commands.ts'

export interface CommandOutcome {
  readonly exitCode: number
  readonly stdout: string
  readonly stderr: string
}

interface Output {
  readonly code: number
  readonly stdout: Uint8Array
  readonly stderr: Uint8Array
}

async function spawn(
  executable: string,
  args: readonly string[],
  cwd: string,
  signal: AbortSignal,
): Promise<Output> {
  const command = new Deno.Command(executable, {
    args: [...args],
    cwd,
    signal,
    stdout: 'piped',
    stderr: 'piped',
  })
  return await command.output()
}

export async function resolveWorkspaceRoot(signal: AbortSignal): Promise<string> {
  if (signal.aborted) {
    throw new RunCancelled('resolving the workspace root')
  }
  const outcome = await spawn('git', ['rev-parse', '--show-toplevel'], Deno.cwd(), signal)
  const root = new TextDecoder().decode(outcome.stdout).trim()
  if (outcome.code !== 0 || root === '') {
    const detail = new TextDecoder().decode(outcome.stderr).trim()
    throw new CommandFailed('git rev-parse --show-toplevel', outcome.code, detail)
  }
  return root
}

export async function runCommand(
  plan: PlannedCommand,
  signal: AbortSignal,
  root: string,
): Promise<CommandOutcome> {
  if (signal.aborted) {
    throw new RunCancelled(plan.executable)
  }
  const output = await spawn(plan.executable, plan.args, root, signal)
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
  root: string,
): Promise<CommandOutcome> {
  const outcome = await runCommand(plan, signal, root)
  if (outcome.exitCode !== 0) {
    throw new CommandFailed(action, outcome.exitCode, outcome.stderr || outcome.stdout)
  }
  return outcome
}

export async function pause(milliseconds: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, milliseconds)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}
