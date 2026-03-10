import type { TsMorphProjectBuilder } from '../../../domain/module-context-builder'
import { resolveModuleTsConfigDir } from './find-module-tsconfig-dir'
import { loadExtractionProject } from './load-extraction-project'

/** @riviere-role external-client */
export class DefaultTsMorphProjectBuilder implements TsMorphProjectBuilder {
  build(configDir: string, modulePath: string, moduleFiles: string[], skipTsConfig: boolean) {
    const projectRoot = resolveModuleTsConfigDir(configDir, modulePath)
    return loadExtractionProject(projectRoot, moduleFiles, skipTsConfig)
  }
}
