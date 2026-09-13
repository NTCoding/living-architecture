import { z } from 'zod'

const repositorySchema = z.object({ owner: z.object({ login: z.string() }), name: z.string() })
type GhRunner = (argumentsList: readonly string[]) => string

/** @riviere-role external-client-service */
export function createGithubPullRequestCommentClient(
  runGh: GhRunner,
): (prNumber: number, body: string) => void {
  return (prNumber, body) => {
    const repository = repositorySchema.parse(
      JSON.parse(runGh(['repo', 'view', '--json', 'owner,name'])),
    )
    runGh([
      'api',
      '--method',
      'POST',
      `repos/${repository.owner.login}/${repository.name}/issues/${String(prNumber)}/comments`,
      '-f',
      `body=${body}`,
    ])
  }
}
