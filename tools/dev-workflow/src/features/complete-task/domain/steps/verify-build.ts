import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import {
  success, failure 
} from '../../../../platform/domain/workflow-execution/step-result'
import type { CompleteTaskContext } from '../task-to-complete'

interface BuildResult {
  failed: boolean
  output: string
}

/** @riviere-role value-object */
export interface VerifyBuildDeps {runMany: (targets: string[]) => Promise<BuildResult>}

/** @riviere-role domain-service */
export function createVerifyBuildStep(deps: VerifyBuildDeps): Step<CompleteTaskContext> {
  return {
    name: 'verify-build',
    execute: async () => {
      const result = await deps.runMany(['lint', 'typecheck'])

      if (result.failed) {
        return failure({
          type: 'fix_errors',
          details: result.output,
        })
      }

      return success()
    },
  }
}
