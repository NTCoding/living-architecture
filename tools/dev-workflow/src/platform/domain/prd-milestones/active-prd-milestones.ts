import { readdirSync } from 'node:fs'

const PRD_PREFIX = 'PRD-'
const MD_SUFFIX = '.md'

/** @riviere-role domain-service */
export function findActivePrdMilestones(prdActiveDir: string): string[] {
  try {
    return readdirSync(prdActiveDir, { encoding: 'utf8' })
      .filter((f) => f.startsWith(PRD_PREFIX) && f.endsWith(MD_SUFFIX))
      .map((f) => f.slice(PRD_PREFIX.length, -MD_SUFFIX.length))
  } catch {
    return []
  }
}
