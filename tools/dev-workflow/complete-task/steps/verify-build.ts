import type { Step } from '../../workflow-runner/workflow-runner'
import {
  success, failure 
} from '../../workflow-runner/workflow-runner'
import { nx } from '../../external-clients/nx'
import type { CompleteTaskContext } from '../complete-task'

export const verifyBuild: Step<CompleteTaskContext> = async () => {
  const result = await nx.runMany(['lint', 'typecheck', 'test'])

  if (result.failed) {
    return failure({
      type: 'fix_errors',
      details: result.output,
    })
  }

  return success()
}
