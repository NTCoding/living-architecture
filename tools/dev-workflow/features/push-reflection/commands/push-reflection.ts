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

class MissingReflectionError extends Error {
  constructor() {
    super(
      '--follow-ups requires a reflection file in a prior commit on this branch.\n' +
        'Run push-reflection without --follow-ups first to push the reflection commit.',
    )
    this.name = 'MissingReflectionError'
  }
}

export interface PushReflectionOptions {readonly followUps: boolean}

export async function executePushReflection(
  options: PushReflectionOptions,
): Promise<{ pushedFiles: string[] }> {
  const files = await git.lastCommitFiles()
  if (files.length === 0) {
    throw new EmptyCommitError()
  }

  if (options.followUps) {
    await verifyReflectionExistsInPriorCommits()
  } else {
    rejectNonReflectionFiles(files)
  }

  await git.push()
  return { pushedFiles: files }
}

async function verifyReflectionExistsInPriorCommits(): Promise<void> {
  const baseBranch = await git.baseBranch()
  const priorFiles = await git.branchFilesPriorToHead(baseBranch)
  const hasReflection = priorFiles.some((f) => f.startsWith(REFLECTION_DIR))
  if (!hasReflection) {
    throw new MissingReflectionError()
  }
}

function rejectNonReflectionFiles(files: string[]): void {
  const nonReflectionFiles = files.filter((f) => !f.startsWith(REFLECTION_DIR))
  if (nonReflectionFiles.length > 0) {
    throw new NonReflectionFilesError(nonReflectionFiles)
  }
}
