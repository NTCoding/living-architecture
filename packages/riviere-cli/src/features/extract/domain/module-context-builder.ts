import type { Project } from 'ts-morph'
import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import { ModuleContext } from './module-context'

export interface FileSearcher {findFiles(modulePath: string, moduleGlob: string, configDir: string): string[]}

export interface TsMorphProjectBuilder {
  build(
    configDir: string,
    modulePath: string,
    moduleFiles: string[],
    skipTsConfig: boolean,
  ): Project
}

/** @riviere-role domain-factory */
export class ModuleContextBuilder {
  constructor(
    private readonly fileSearcher: FileSearcher,
    private readonly projectBuilder: TsMorphProjectBuilder,
  ) {}

  buildAll(
    resolvedConfig: ResolvedExtractionConfig,
    configDir: string,
    sourceFilePaths: string[],
    skipTsConfig: boolean,
  ): ModuleContext[] {
    const sourceFileSet = new Set(sourceFilePaths)

    return resolvedConfig.modules.map((module) => {
      const allModuleFiles = this.fileSearcher.findFiles(module.path, module.glob, configDir)
      const moduleFiles = allModuleFiles.filter((filePath) => sourceFileSet.has(filePath))
      const project = this.projectBuilder.build(configDir, module.path, moduleFiles, skipTsConfig)

      return new ModuleContext(module, moduleFiles, project)
    })
  }
}
