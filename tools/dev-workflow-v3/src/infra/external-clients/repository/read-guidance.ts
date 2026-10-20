import { readFile } from 'node:fs/promises'

const GUIDANCE_FILES = [
  'AGENTS.md',
  'docs/conventions/software-design.md',
  'docs/conventions/standard-patterns.md',
  'docs/conventions/anti-patterns.md',
  'docs/conventions/testing.md',
  'docs/architecture/adr/ADR-002-allowed-folder-structures.md',
  '.riviere/role-selection-guide.md',
  'docs/architecture/domain-terminology/contextive/definitions.glossary.yml',
]

/**
 * @riviere-role external-client-service
 */
export async function readRepositoryGuidance(repositoryRoot: string): Promise<string> {
  const sections: string[] = []
  for (const path of GUIDANCE_FILES) {
    const contents = await readIfPresent(`${repositoryRoot}/${path}`)
    if (contents !== undefined) sections.push(`## ${path}\n\n${contents}`)
  }
  return sections.join('\n\n')
}

async function readIfPresent(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return undefined
  }
}
