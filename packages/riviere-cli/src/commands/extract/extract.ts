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
import {
  extractComponents,
  resolveConfig,
  type DraftComponent,
} from '@living-architecture/riviere-extract-ts'
import {
  formatError, formatSuccess 
} from '../../output'
import { CliErrorCode } from '../../error-codes'
import { createConfigLoader } from './config-loader'
import { expandModuleRefs } from './expand-module-refs'

interface ExtractOptions {
  config: string
  dryRun?: boolean
}

type ParseResult =
  | {
    success: true
    data: unknown
  }
  | {
    success: false
    error: string
  }

/* v8 ignore start -- @preserve: trivial comparator, Map keys guarantee a !== b */
function compareByCodePoint(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
/* v8 ignore stop */

function formatDryRunOutput(components: DraftComponent[]): string[] {
  const countsByDomain = new Map<string, Map<string, number>>()

  for (const component of components) {
    const existingTypeCounts = countsByDomain.get(component.domain)
    const typeCounts = existingTypeCounts ?? new Map<string, number>()
    if (existingTypeCounts === undefined) {
      countsByDomain.set(component.domain, typeCounts)
    }
    const currentCount = typeCounts.get(component.type) ?? 0
    typeCounts.set(component.type, currentCount + 1)
  }

  const sortedDomains = [...countsByDomain.entries()].sort(([a], [b]) => compareByCodePoint(a, b))
  const lines: string[] = []
  for (const [domain, typeCounts] of sortedDomains) {
    const typeStrings = [...typeCounts.entries()]
      .sort(([a], [b]) => compareByCodePoint(a, b))
      .map(([type, count]) => `${type}(${count})`)
    lines.push(`${domain}: ${typeStrings.join(', ')}`)
  }
  return lines
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
    .option('--dry-run', 'Show component counts per domain without full output')
    .action((options: ExtractOptions) => {
      if (!existsSync(options.config)) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ConfigNotFound, `Config file not found: ${options.config}`),
          ),
        )
        process.exit(1)
      }

      const content = readFileSync(options.config, 'utf-8')
      const parseResult = parseConfigFile(content)

      if (!parseResult.success) {
        console.log(
          JSON.stringify(
            formatError(CliErrorCode.ValidationError, `Invalid config file: ${parseResult.error}`),
          ),
        )
        process.exit(1)
      }

      const configDir = dirname(resolve(options.config))
      const expandedData = expandModuleRefs(parseResult.data, configDir)

      if (!isValidExtractionConfig(expandedData)) {
        const validationResult = validateExtractionConfig(expandedData)
        console.log(
          JSON.stringify(
            formatError(
              CliErrorCode.ValidationError,
              `Invalid extraction config:\n${formatValidationErrors(validationResult.errors)}`,
            ),
          ),
        )
        process.exit(1)
      }

      const unresolvedConfig = expandedData
      const configLoader = createConfigLoader(configDir)
      const resolvedConfig = resolveConfig(unresolvedConfig, configLoader)

      const sourceFilePaths = resolvedConfig.modules
        .flatMap((module) => globSync(module.path, { cwd: configDir }))
        .map((filePath) => resolve(configDir, filePath))

      if (sourceFilePaths.length === 0) {
        const patterns = resolvedConfig.modules.map((m) => m.path).join(', ')
        console.log(
          JSON.stringify(
            formatError(
              CliErrorCode.ValidationError,
              `No files matched extraction patterns: ${patterns}\nConfig directory: ${configDir}`,
            ),
          ),
        )
        process.exit(1)
      }

      const project = new Project()
      project.addSourceFilesAtPaths(sourceFilePaths)

      const components = extractComponents(project, sourceFilePaths, resolvedConfig, configDir)

      if (options.dryRun) {
        const lines = formatDryRunOutput(components)
        for (const line of lines) {
          console.log(line)
        }
        return
      }

      console.log(JSON.stringify(formatSuccess(components)))
    })
}
