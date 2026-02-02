const REFLECTION_DIR = 'docs/continuous-improvement/post-merge-reflections'

export function sanitizeBranchNameForPath(branch: string): string {
  return branch.replaceAll(/[^a-zA-Z0-9_-]/g, '_')
}

export function buildReflectionFilePath(branch: string, dateIso: string): string {
  const safeBranch = sanitizeBranchNameForPath(branch)
  return `${REFLECTION_DIR}/${dateIso}-${safeBranch}.md`
}
