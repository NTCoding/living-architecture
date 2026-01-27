import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import {
  success, failure 
} from '../../../../platform/domain/workflow-execution/step-result'
import { nx } from '../../../../platform/infra/external-clients/nx-runner'
import type { CompleteTaskContext } from '../task-to-complete'

export const verifyBuild: Step<CompleteTaskContext> = {
  name: 'verify-build',
  execute: async () => {
    const result = await nx.runMany(['lint', 'typecheck', 'test'])

    if (result.failed) {
      return failure({
        type: 'fix_errors',
        details: result.output,
      })
    }

    return success()
  },
}
