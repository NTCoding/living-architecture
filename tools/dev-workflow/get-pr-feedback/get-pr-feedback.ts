#!/usr/bin/env tsx
import { git } from '../external-clients/git'
import {
  github, getRepoInfo 
} from '../external-clients/github'

interface PRFeedbackItem {
  location: string
  author: string
  body: string
}

interface PRStatus {
  branch: string
  prNumber: number | undefined
  prUrl?: string
  mergeable: boolean
  unresolvedFeedback: PRFeedbackItem[]
  feedbackCount: number
  message?: string
}

function formatFeedbackLocation(file?: string, line?: number): string {
  if (!file) {
    return 'PR-level'
  }
  if (!line) {
    return file
  }
  return `${file}:${line}`
}

async function main(): Promise<void> {
  const branch = await git.currentBranch()
  const prNumber = await github.findPRForBranch(branch)

  if (!prNumber) {
    const status: PRStatus = {
      branch,
      prNumber: undefined,
      mergeable: false,
      unresolvedFeedback: [],
      feedbackCount: 0,
      message: `No open PR found for branch "${branch}"`,
    }
    console.log(JSON.stringify(status, null, 2))
    return
  }

  const [feedback, repoInfo] = await Promise.all([
    github.getUnresolvedFeedback(prNumber),
    getRepoInfo(),
  ])

  const status: PRStatus = {
    branch,
    prNumber,
    prUrl: `https://github.com/${repoInfo.owner}/${repoInfo.repo}/pull/${prNumber}`,
    mergeable: feedback.length === 0,
    unresolvedFeedback: feedback.map((f) => ({
      location: formatFeedbackLocation(f.file, f.line),
      author: f.author,
      body: f.body,
    })),
    feedbackCount: feedback.length,
  }

  console.log(JSON.stringify(status, null, 2))
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ error: errorMessage }, null, 2))
  process.exit(1)
})
