import type { Step } from '../../workflow-runner/workflow-runner'
import {
  success, failure 
} from '../../workflow-runner/workflow-runner'
import { git } from '../../external-clients/git'
import { github } from '../../external-clients/github'

export const submitPR: Step = async (ctx) => {
  const uncommitted = await git.uncommittedFiles()
  if (uncommitted.length > 0) {
    await git.stageAll()
    await git.commit(ctx.commitMessage)
  }
  await git.push()

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

  const ciResult = await github.watchCI(pr.number)

  if (ciResult.failed) {
    return failure('fix_errors', ciResult.output)
  }

  return success()
}
