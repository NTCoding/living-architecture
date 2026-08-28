import { createConfiguredProject } from './create-configured-project'
import { findModuleTsConfigDir } from './find-module-tsconfig-dir'

/** @riviere-role external-client-service */
export function createTypeScriptProjects<T extends Readonly<{ path: string }>>(
  configDirectory: string,
  sourceFiles: ReadonlyMap<T, string[]>,
  useTsConfig: boolean,
) {
  const projects = new Map<
    T,
    { files: string[]; project: ReturnType<typeof createConfiguredProject> }
  >()
  for (const [module, files] of sourceFiles) {
    const project = createConfiguredProject(
      findModuleTsConfigDir(configDirectory, module.path),
      !useTsConfig,
    )
    project.addSourceFilesAtPaths(files)
    projects.set(module, { files, project })
  }
  return projects
}
