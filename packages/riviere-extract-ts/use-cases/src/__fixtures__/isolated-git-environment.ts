const GIT_REPOSITORY_ENVIRONMENT_VARIABLES = [
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_CONFIG',
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
  'GIT_OBJECT_DIRECTORY',
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_IMPLICIT_WORK_TREE',
  'GIT_GRAFT_FILE',
  'GIT_INDEX_FILE',
  'GIT_NO_REPLACE_OBJECTS',
  'GIT_REPLACE_REF_BASE',
  'GIT_PREFIX',
  'GIT_SHALLOW_FILE',
  'GIT_COMMON_DIR',
] as const

export function createIsolatedGitEnvironment(): NodeJS.ProcessEnv {
  const environment = { ...process.env }
  for (const variableName of GIT_REPOSITORY_ENVIRONMENT_VARIABLES) {
    delete environment[variableName]
  }
  return environment
}

export function runIsolatedGitCommand(args: readonly string[], cwd: string): void {
  const executable = process.env['GIT_EXECUTABLE'] ?? '/usr/bin/git'
  execFileSync(executable, args, {
    cwd,
    env: createIsolatedGitEnvironment(),
    stdio: 'ignore',
  })
}
import { execFileSync } from 'node:child_process'
