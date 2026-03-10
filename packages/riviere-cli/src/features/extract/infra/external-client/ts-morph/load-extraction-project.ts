import type { Project } from 'ts-morph'
import { createConfiguredProject } from './create-configured-project'

/** @riviere-role external-client */
export function loadExtractionProject(
  configDir: string,
  sourceFilePaths: string[],
  skipTsConfig: boolean,
): Project {
  const project = createConfiguredProject(configDir, skipTsConfig)
  project.addSourceFilesAtPaths(sourceFilePaths)
  return project
}
