import simpleGit from 'simple-git'
import { GitError } from '../errors'

const repo = simpleGit()

export const git = {
  async diffFiles(base: string): Promise<string[]> {
    const diff = await repo.diff(['--name-only', base])
    return diff.split('\n').filter(Boolean)
  },

  async uncommittedFiles(): Promise<string[]> {
    const status = await repo.status()
    const renamed = status.renamed.map((entry) => entry.to)
    return [
      ...status.modified,
      ...status.not_added,
      ...status.created,
      ...status.deleted,
      ...status.conflicted,
      ...status.staged,
      ...renamed,
    ]
  },

  async stagedFiles(): Promise<string[]> {
    const status = await repo.status()
    return status.staged
  },

  async stageAll(): Promise<void> {
    await repo.add('.')
  },

  async commit(message: string): Promise<void> {
    await repo.commit(message)
  },

  async push(): Promise<void> {
    await repo.push(['-u', 'origin', 'HEAD'])
  },

  async currentBranch(): Promise<string> {
    const status = await repo.status()
    if (!status.current) {
      throw new GitError('Could not determine current branch. Are you in a git repository?')
    }
    return status.current
  },

  async baseBranch(): Promise<string> {
    const remotes = await repo.getRemotes(true)
    if (!remotes.some((r) => r.name === 'origin')) {
      throw new GitError('No origin remote found. Please configure an origin remote.')
    }

    const refs = await repo.branch(['-r'])
    if (refs.all.includes('origin/main')) return 'main'
    if (refs.all.includes('origin/master')) return 'master'
    throw new GitError(
      `No base branch found. Expected origin/main or origin/master but found: ${refs.all.filter((r) => r.startsWith('origin/')).join(', ')}`,
    )
  },

  async headSha(): Promise<string> {
    const sha = await repo.revparse(['HEAD'])
    return sha.trim()
  },
}
