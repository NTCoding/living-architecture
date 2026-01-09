import {
  existsSync, readFileSync 
} from 'node:fs'
import {
  dirname, resolve 
} from 'node:path'
import { Command } from 'commander'
import { parse as parseYaml } from 'yaml'
import { globSync } from 'glob'
import { Project } from 'ts-morph'
import {
  validateExtractionConfig,
  formatValidationErrors,
  isValidExtractionConfig,
} from '@living-architecture/riviere-extract-config'
import { extractComponents } from '@living-architecture/riviere-extract-ts'
import {
  formatError, formatSuccess 
} from '../../output'
import { CliErrorCode } from '../../error-codes'

interface ExtractOptions {config: string}

type ParseResult =
  | {
    success: true
    data: unknown
  }
  | {
    success: false
    error: string
  }

function parseConfigFile(content: string): ParseResult {
  try {
    return {
      success: true,
      data: parseYaml(content),
    }
  } catch (error) {
    /* v8 ignore next -- @preserve: yaml library always throws Error instances; defensive guard */
    const message = error instanceof Error ? error.message : 'Unknown parse error'
    return {
      success: false,
      error: message,
    }
  }
}

export function createExtractCommand(): Command {
  return new Command('extract')
    .description('Extract architectural components from source code')
    .requiredOption('--config <path>', 'Path to extraction config file')
    .action((options: ExtractOptions) => {
      if (!existsSync(options.config)) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ConfigNotFound, `Config file not found: ${options.config}`),
          ),
        )
        return
      }

      const content = readFileSync(options.config, 'utf-8')
      const parseResult = parseConfigFile(content)

      if (!parseResult.success) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ValidationError, `Invalid config file: ${parseResult.error}`),
          ),
        )
        return
      }

      if (!isValidExtractionConfig(parseResult.data)) {
        const validationResult = validateExtractionConfig(parseResult.data)
        console.log(
          JSON.stringify(
            formatError(
              CliErrorCode.ValidationError,
              `Invalid extraction config:\n${formatValidationErrors(validationResult.errors)}`,
            ),
          ),
        )
        return
      }

      const config = parseResult.data
      const configDir = dirname(resolve(options.config))

      const sourceFilePaths = config.modules
        .flatMap((module) => globSync(module.path, { cwd: configDir }))
        .map((filePath) => resolve(configDir, filePath))

      const project = new Project()
      for (const filePath of sourceFilePaths) {
        project.addSourceFileAtPath(filePath)
      }

      const components = extractComponents(project, sourceFilePaths, config)

      console.log(JSON.stringify(formatSuccess(components)))
    })
}
