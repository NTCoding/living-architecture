/**
 * Abstracts I/O operations for workflow execution.
 * Domain layer uses this interface; infra layer provides implementation.
 */
export interface WorkflowIO {
  writeFile: (path: string, content: string) => void
  log: (output: string) => void
  exit: (code: number) => void
}
