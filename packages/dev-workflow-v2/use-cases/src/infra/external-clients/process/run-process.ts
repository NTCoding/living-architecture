import { spawnSync } from 'node:child_process'
import { z } from 'zod'

const PROCESS_INVOCATION_SCHEMA = z.object({
  command: z.string().min(1),
  arguments: z.array(z.string()),
  environment: z.record(z.string()),
})
const PROCESS_RESULT_SCHEMA = z.object({
  status: z.number().int().nullable(),
  signal: z.string().nullable(),
  stdout: z.string().nullish(),
  stderr: z.string().nullish(),
  error: z.string().optional(),
})

/** @riviere-role external-client-error */
class ProcessExecutionError extends Error {
  constructor(
    invocation: z.infer<typeof PROCESS_INVOCATION_SCHEMA>,
    result: z.infer<typeof PROCESS_RESULT_SCHEMA>,
  ) {
    super(
      `Command ${JSON.stringify([invocation.command, ...invocation.arguments])} failed in ${process.cwd()}: ${JSON.stringify(result)}`,
    )
    this.name = 'ProcessExecutionError'
  }
}

/** @riviere-role external-client-service */
export function runProcess(input: z.infer<typeof PROCESS_INVOCATION_SCHEMA>): void {
  const invocation = PROCESS_INVOCATION_SCHEMA.parse(input)
  const execution = spawnSync(invocation.command, invocation.arguments, {
    encoding: 'utf8',
    env: { ...process.env, ...invocation.environment },
    maxBuffer: 16 * 1024 * 1024,
  })
  const result = PROCESS_RESULT_SCHEMA.parse({ ...execution, error: execution.error?.message })
  if (result.status !== 0) throw new ProcessExecutionError(invocation, result)
}
