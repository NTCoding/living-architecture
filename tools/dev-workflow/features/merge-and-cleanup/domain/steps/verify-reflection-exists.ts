import {
  access, constants 
} from 'node:fs/promises'
import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import {
  success, failure 
} from '../../../../platform/domain/workflow-execution/step-result'
import type { MergeCleanupContext } from '../merge-cleanup-context'

interface VerifyReflectionDeps {fileExists: (path: string) => Promise<boolean>}

/* v8 ignore start -- default implementation, tested via injected deps */
async function defaultFileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK)
    return true
  } catch {
    return false
  }
}
/* v8 ignore stop */

export function createVerifyReflectionExistsStep(
  deps: VerifyReflectionDeps = { fileExists: defaultFileExists },
): Step<MergeCleanupContext> {
  return {
    name: 'verify-reflection-exists',
    async execute(ctx) {
      const exists = await deps.fileExists(ctx.reflectionFilePath)

      if (!exists) {
        return failure({
          nextAction: 'run_reflection',
          nextInstructions:
            `Reflection file not found: ${ctx.reflectionFilePath}\n` +
            'Run /pre-merge-reflection first to generate the reflection before merging.',
        })
      }

      return success()
    },
  }
}
