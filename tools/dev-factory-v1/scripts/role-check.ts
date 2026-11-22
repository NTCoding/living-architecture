import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import {
  createOxlintRoleEnforcementRunner,
  PackageConfigFilter,
  RoleEnforcementProjectRepository,
  RunRoleEnforcement,
  runOxlint,
} from '@living-architecture/riviere-role-enforcement-use-cases'

const configModulePath = process.argv[2]

if (configModulePath === undefined) {
  process.stderr.write('Usage: tsx scripts/role-check.ts <config-module-path>\n')
  process.exitCode = 1
} else {
  const pluginPath = fileURLToPath(
    import.meta.resolve('@living-architecture/riviere-role-enforcement-domain-model/plugin'),
  )
  const application = new RunRoleEnforcement({
    now: () => performance.now(),
    projectRepository: new RoleEnforcementProjectRepository(new PackageConfigFilter()),
    runner: createOxlintRoleEnforcementRunner(runOxlint, pluginPath),
  })

  const result = application.execute({
    configModulePath: path.resolve(configModulePath),
    configDir: process.cwd(),
  })

  process.stdout.write(result.stdout)
  process.stderr.write(result.stderr)
  process.exitCode = result.exitCode
}
