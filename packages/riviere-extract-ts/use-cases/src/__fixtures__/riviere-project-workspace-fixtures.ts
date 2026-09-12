import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const directories: string[] = []

export function createWorkflowWorkspace(): string {
  const directory = mkdtempSync(join(tmpdir(), 'project-workflow-test-'))
  directories.push(directory)
  mkdirSync(join(directory, '.riviere', 'workflows'), { recursive: true })
  writeFileSync(join(directory, 'package.json'), '{"name":"workflow-test"}')
  writeFileSync(join(directory, 'component.ts'), 'export class Component {}')
  runIsolatedGit(directory, ['init', '--initial-branch=main'])
  runIsolatedGit(directory, [
    'remote',
    'add',
    'origin',
    'https://github.com/test/workflow-test.git',
  ])
  return directory
}

function runIsolatedGit(directory: string, args: readonly string[]): void {
  const environment = { ...process.env }
  for (const name of Object.keys(environment)) {
    if (name.startsWith('GIT_')) delete environment[name]
  }
  execFileSync(process.env['GIT_EXECUTABLE'] ?? 'git', args, {
    cwd: directory,
    env: environment,
    stdio: 'ignore',
  })
}

export function cleanupWorkflowWorkspaces(): void {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true })
}
