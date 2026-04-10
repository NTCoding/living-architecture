import {
  mkdtempSync, mkdirSync, rmSync, writeFileSync 
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { genericTestRoles } from './test-fixture-config'

interface WorkspaceBootstrap {
  readonly prefix: string
  readonly roles: readonly { readonly name: string }[]
  readonly files: Readonly<Record<string, string>>
}

export function withWorkspaceFixture(
  bootstrap: WorkspaceBootstrap,
  fn: (workspaceDir: string) => void,
): void {
  const workspaceDir = createWorkspaceFixture(bootstrap)
  try {
    fn(workspaceDir)
  } finally {
    rmSync(workspaceDir, {
      force: true,
      recursive: true,
    })
  }
}

export function writeFixtureFile(
  workspaceDir: string,
  relativePath: string,
  content: string,
): void {
  const fullPath = path.join(workspaceDir, relativePath)
  mkdirSync(path.dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

export function withGenericFixtureWorkspace(fn: (workspaceDir: string) => void): void {
  withWorkspaceFixture(
    {
      prefix: 'role-enforcement-workspace-',
      roles: genericTestRoles,
      files: genericFixtureFiles,
    },
    fn,
  )
}

export function writeCommandFile(workspaceDir: string, content: string): void {
  writeFixtureFile(workspaceDir, 'packages/pkg-a/src/commands/doAlpha.ts', content)
}

export function writeDomainFile(workspaceDir: string, content: string): void {
  writeFixtureFile(workspaceDir, 'packages/pkg-a/src/domain/beta.ts', content)
}

export function writeRepositoryFile(workspaceDir: string, content: string): void {
  writeFixtureFile(workspaceDir, 'packages/pkg-a/src/repositories/betaRepository.ts', content)
}

function createWorkspaceFixture(bootstrap: WorkspaceBootstrap): string {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), bootstrap.prefix))
  writeFixtureFile(
    workspaceDir,
    '.riviere/canonical-role-configurations.md',
    '# Canonical Role Configurations',
  )
  for (const r of bootstrap.roles) {
    writeFixtureFile(workspaceDir, `.riviere/role-definitions/${r.name}.md`, `# ${r.name}`)
  }
  for (const [relativePath, content] of Object.entries(bootstrap.files)) {
    writeFixtureFile(workspaceDir, relativePath, content)
  }
  return workspaceDir
}

const genericFixtureFiles: Readonly<Record<string, string>> = {
  'packages/pkg-a/src/commands/alphaInput.ts': `/** @riviere-role role-a-input */
export interface AlphaInput {
  configPath: string
}
`,
  'packages/pkg-a/src/commands/alphaResult.ts': `/** @riviere-role role-a-result */
export interface AlphaResult {
  status: 'ok'
}
`,
  'packages/pkg-a/src/commands/doAlpha.ts': `import type { AlphaInput } from './alphaInput'
import type { AlphaResult } from './alphaResult'

/** @riviere-role role-a */
export function doAlpha(alphaInput: AlphaInput): AlphaResult {
  return {
    status: 'ok',
  }
}
`,
  'packages/pkg-a/src/entrypoint/entry.ts': `/** @riviere-role role-entry */
export function createEntry(): void {}
`,
  'packages/pkg-a/src/domain/alphaError.ts': `/** @riviere-role role-c-error */
export class AlphaError extends Error {}
`,
  'packages/pkg-a/src/domain/beta.ts': `/** @riviere-role role-b */
export class Beta {
  cancel(): void {}
}
`,
  'packages/pkg-a/src/repositories/betaRepository.ts': `import type { Beta } from '../domain/beta'

/** @riviere-role role-b-repository */
export class BetaRepository {
  findById(id: string): Beta {
    return null as unknown as Beta
  }
}
`,
}
