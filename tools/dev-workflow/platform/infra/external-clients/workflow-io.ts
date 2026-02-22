import { writeFileSync } from 'node:fs'
import { type WorkflowIO } from '../../domain/workflow-io'

/**
 * Default workflow I/O implementation using Node.js built-ins.
 */
export function createDefaultWorkflowIO(): WorkflowIO {
  return {
    writeFile(path: string, content: string): void {
      writeFileSync(path, content, 'utf-8')
    },
    log(output: string): void {
      console.log(output)
    },
    exit(code: number): void {
      process.stdout.write('', () => {
        process.exit(code)
      })
    },
  }
}
