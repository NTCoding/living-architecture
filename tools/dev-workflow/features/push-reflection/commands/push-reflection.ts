import { git } from '../../../platform/infra/external-clients/git-client'

const REFLECTION_DIR = 'docs/continuous-improvement/post-merge-reflections/'

class EmptyCommitError extends Error {
  constructor() {
    super('No files in latest commit.')
    this.name = 'EmptyCommitError'
  }
}

class NonReflectionFilesError extends Error {
  constructor(files: string[]) {
    super(
      `Latest commit contains non-reflection files:\n${files.join('\n')}\n\n` +
        'push-reflection only pushes commits that exclusively contain reflection files.',
    )
    this.name = 'NonReflectionFilesError'
  }
}

export async function executePushReflection(): Promise<{ pushedFiles: string[] }> {
  const files = await git.lastCommitFiles()
  if (files.length === 0) {
    throw new EmptyCommitError()
  }

  const nonReflectionFiles = files.filter((f) => !f.startsWith(REFLECTION_DIR))
  if (nonReflectionFiles.length > 0) {
    throw new NonReflectionFilesError(nonReflectionFiles)
  }

  await git.push()
  return { pushedFiles: files }
}
