import type { Step } from '../../workflow-runner/workflow-runner'
import { success } from '../../workflow-runner/workflow-runner'
import { github } from '../../external-clients/github'
import type { GetPRStatusContext } from '../get-pr-status'

type PRLifecycleState = 'merged' | 'open' | 'closed' | 'not_found'

interface PRStatus {
  state: PRLifecycleState
  prNumber?: number
  prUrl?: string
  branch: string
}

export const fetchStatus: Step<GetPRStatusContext> = {
  name: 'fetch-status',
  execute: async (ctx) => {
    const prInfo = await github.findPRForBranchWithState(ctx.branch)

    if (!prInfo) {
      const status: PRStatus = {
        state: 'not_found',
        branch: ctx.branch,
      }
      return success(status)
    }

    const status: PRStatus = {
      state: prInfo.state,
      prNumber: prInfo.number,
      prUrl: prInfo.url,
      branch: ctx.branch,
    }

    return success(status)
  },
}
