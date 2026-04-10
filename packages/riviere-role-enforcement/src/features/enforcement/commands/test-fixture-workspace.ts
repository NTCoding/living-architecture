import {
  mkdtempSync, mkdirSync, rmSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { genericTestRoles } from './test-fixture-config'

function createGenericFixtureWorkspace(): string {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'role-enforcement-workspace-'))
  const pkgDir = path.join(workspaceDir, 'packages', 'pkg-a')
  mkdirSync(path.join(pkgDir, 'src', 'commands'), { recursive: true })
  mkdirSync(path.join(pkgDir, 'src', 'entrypoint'), { recursive: true })
  mkdirSync(path.join(pkgDir, 'src', 'domain'), { recursive: true })
  mkdirSync(path.join(pkgDir, 'src', 'repositories'), { recursive: true })
  mkdirSync(path.join(workspaceDir, '.riviere', 'role-definitions'), { recursive: true })

  seedFixtureSources(pkgDir)
  seedFixtureRoleDefinitions(workspaceDir)

  return workspaceDir
}

export function withGenericFixtureWorkspace(fn: (workspaceDir: string) => void): void {
  const workspaceDir = createGenericFixtureWorkspace()
  try {
    fn(workspaceDir)
  } finally {
    rmSync(workspaceDir, {
      force: true,
      recursive: true,
    })
  }
}

export function writeCommandFile(workspaceDir: string, content: string): void {
  writeFileSync(
    path.join(workspaceDir, 'packages', 'pkg-a', 'src', 'commands', 'doAlpha.ts'),
    content,
  )
}

export function writeDomainFile(workspaceDir: string, content: string): void {
  writeFileSync(path.join(workspaceDir, 'packages', 'pkg-a', 'src', 'domain', 'beta.ts'), content)
}

export function writeRepositoryFile(workspaceDir: string, content: string): void {
  writeFileSync(
    path.join(workspaceDir, 'packages', 'pkg-a', 'src', 'repositories', 'betaRepository.ts'),
    content,
  )
}

function seedFixtureSources(pkgDir: string): void {
  writeFileSync(
    path.join(pkgDir, 'src', 'commands', 'alphaInput.ts'),
    `/** @riviere-role role-a-input */
export interface AlphaInput {
  configPath: string
}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'commands', 'alphaResult.ts'),
    `/** @riviere-role role-a-result */
export interface AlphaResult {
  status: 'ok'
}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'commands', 'doAlpha.ts'),
    `import type { AlphaInput } from './alphaInput'
import type { AlphaResult } from './alphaResult'

/** @riviere-role role-a */
export function doAlpha(alphaInput: AlphaInput): AlphaResult {
  return {
    status: 'ok',
  }
}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'entrypoint', 'entry.ts'),
    `/** @riviere-role role-entry */
export function createEntry(): void {}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'domain', 'alphaError.ts'),
    `/** @riviere-role role-c-error */
export class AlphaError extends Error {}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'domain', 'beta.ts'),
    `/** @riviere-role role-b */
export class Beta {
  cancel(): void {}
}
`,
  )
  writeFileSync(
    path.join(pkgDir, 'src', 'repositories', 'betaRepository.ts'),
    `import type { Beta } from '../domain/beta'

/** @riviere-role role-b-repository */
export class BetaRepository {
  findById(id: string): Beta {
    return null as unknown as Beta
  }
}
`,
  )
}

function seedFixtureRoleDefinitions(workspaceDir: string): void {
  const roleDefsDir = path.join(workspaceDir, '.riviere', 'role-definitions')
  writeFileSync(
    path.join(workspaceDir, '.riviere', 'canonical-role-configurations.md'),
    '# Canonical Role Configurations',
  )
  writeFileSync(path.join(roleDefsDir, 'index.md'), '# Role Definitions')
  for (const r of genericTestRoles) {
    writeFileSync(path.join(roleDefsDir, `${r.name}.md`), `# ${r.name}`)
  }
}
