import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import {
  success, failure 
} from '../../../../platform/domain/workflow-execution/step-result'
import { git } from '../../../../platform/infra/external-clients/git-client'
import { github } from '../../../../platform/infra/external-clients/github-rest-client'
import type { CompleteTaskContext } from '../task-to-complete'

export const submitPR: Step<CompleteTaskContext> = {
  name: 'submit-pr',
  execute: async (ctx) => {
    const uncommitted = await git.uncommittedFiles()
    if (uncommitted.length > 0) {
      await git.stageAll()
      await git.commit(ctx.commitMessage)
    }
    await git.push()

    const headSha = await git.headSha()
    const baseBranch = await git.baseBranch()

    const pr = ctx.prNumber
      ? await github.getPR(ctx.prNumber)
      : await github.createPR({
        title: ctx.prTitle,
        body: ctx.prBody,
        branch: ctx.branch,
        base: baseBranch,
      })

    ctx.prUrl = pr.url
    ctx.prNumber = pr.number

    const ciResult = await github.watchCI(pr.number, headSha)

    if (ciResult.failed) {
      return failure({
        type: 'fix_errors',
        details: ciResult.output,
      })
    }

    return success()
  },
}
