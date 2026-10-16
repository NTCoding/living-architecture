import { dirname } from 'node:path'
import type { LoadCodeExtraction } from '@living-architecture/riviere-extract-ts-domain-model/domain/ports/load-code-extraction'
import { globSourceFiles } from '../../../../infra/external-clients/glob/glob-source-files'
import { createTypeScriptProjects } from '../../../../infra/external-clients/ts-morph/create-typescript-projects'

/** @riviere-role domain-port-adapter */
export function createCodeExtractionAdapter(): LoadCodeExtraction {
  return (input) => {
    const configDirectory = dirname(input.configPath)
    const sourceFilesByModule = globSourceFiles(input.config.modules, configDirectory)
    const moduleSources = createTypeScriptProjects(
      configDirectory,
      sourceFilesByModule,
      input.useTsConfig,
    )
    return [...moduleSources.entries()].map(([module, source]) => ({
      module,
      files: source.files,
      project: source.project,
    }))
  }
}
