import type { Step } from '../../workflow-runner/workflow-runner'
import {
  success, failure 
} from '../../workflow-runner/workflow-runner'
import { nx } from '../../external-clients/nx'

export const verifyBuild: Step = async () => {
  const result = await nx.runMany(['lint', 'typecheck', 'test'])

  if (result.failed) {
    return failure('fix_errors', result.output)
  }

  return success()
}
