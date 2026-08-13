import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import {
  createOxlintRoleEnforcementRunner,
  RoleEnforcementProjectRepository,
  RunRoleEnforcement,
  runOxlint,
} from '@living-architecture/riviere-role-enforcement-use-cases'
import { main } from '../features/role-enforcement/entrypoint/role-enforcement/entrypoint'

const configModulePath = process.argv[2]
if (configModulePath === undefined) {
  process.stderr.write(
    'Usage: riviere-role-enforcement <config-module-path> [--package <package-path>]\n',
  )
  process.exitCode = 1
} else {
  const packageFilter = readPackageFilter(process.argv)
  const absolutePath = path.resolve(configModulePath)
  const pluginPath = fileURLToPath(
    import.meta.resolve('@living-architecture/riviere-role-enforcement/plugin'),
  )
  const application = new RunRoleEnforcement({
    now: () => performance.now(),
    projectRepository: new RoleEnforcementProjectRepository(),
    runner: createOxlintRoleEnforcementRunner(runOxlint, pluginPath),
  })
  void import(absolutePath).then((loaded: unknown) => {
    process.exitCode = main(application, loaded, process.cwd(), packageFilter)
  })
}

function readPackageFilter(argv: readonly string[]): string | undefined {
  const flagIndex = argv.indexOf('--package')
  if (flagIndex < 0) {
    return undefined
  }
  const value = argv[flagIndex + 1]
  if (value === undefined) {
    process.stderr.write('Error: --package requires a value\n')
    process.exitCode = 1
    return undefined
  }
  return value
}
