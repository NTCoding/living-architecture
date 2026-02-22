import type { Project } from 'ts-morph'
import { createConfiguredProject } from './create-configured-project'

export function loadExtractionProject(
  configDir: string,
  sourceFilePaths: string[],
  skipTsConfig: boolean,
): Project {
  const project = createConfiguredProject(configDir, skipTsConfig)
  project.addSourceFilesAtPaths(sourceFilePaths)
  return project
}
