import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { z } from 'zod'

const execFileAsync = promisify(execFile)

interface NxResult {
  failed: boolean
  output: string
}

const execErrorSchema = z.object({
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  code: z.number().optional(),
  message: z.string(),
})

export const nx = {
  async runMany(targets: string[]): Promise<NxResult> {
    try {
      const {
        stdout, stderr 
      } = await execFileAsync('pnpm', ['nx', 'run-many', '-t', ...targets], {maxBuffer: 10 * 1024 * 1024,})

      return {
        failed: false,
        output: stdout + stderr,
      }
    } catch (error) {
      const parsed = execErrorSchema.safeParse(error)
      if (parsed.success) {
        const output = (parsed.data.stdout ?? '') + (parsed.data.stderr ?? '') + parsed.data.message
        return {
          failed: true,
          output,
        }
      }
      return {
        failed: true,
        output: String(error),
      }
    }
  },
}
