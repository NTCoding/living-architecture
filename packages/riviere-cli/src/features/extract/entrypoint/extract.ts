import {
  existsSync, readFileSync, writeFileSync 
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
  type ResolvedExtractionConfig,
} from '@living-architecture/riviere-extract-config'
import {
  extractComponents,
  enrichComponents,
  resolveConfig,
  matchesGlob,
  type DraftComponent,
} from '@living-architecture/riviere-extract-ts'
import {
  formatError,
  formatSuccess,
  type SuccessOutput,
} from '../../../platform/infra/cli-presentation/output'
import { ModuleRefNotFoundError } from '../../../platform/infra/errors/errors'
import {
  CliErrorCode, ExitCode 
} from '../../../platform/infra/cli-presentation/error-codes'
import { createConfigLoader } from '../commands/config-loader'
import { expandModuleRefs } from '../commands/expand-module-refs'
import {
  loadDraftComponentsFromFile,
  DraftComponentLoadError,
} from '../commands/draft-component-loader'
import {
  filterSourceFiles, SourceFilterError 
} from '../commands/filter-source-files'
import { formatPrMarkdown } from '../commands/format-pr-markdown'

interface ExtractOptions {
  config: string
  dryRun?: boolean
  output?: string
  componentsOnly?: boolean
  enrich?: string
  allowIncomplete?: boolean
  pr?: boolean
  base?: string
  files?: string[]
  format?: string
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

/* v8 ignore start -- @preserve: dry-run output formatting; tested via CLI integration */
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
/* v8 ignore stop */

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

function tryExpandModuleRefs(data: unknown, configDir: string): ParseResult {
  try {
    return {
      success: true,
      data: expandModuleRefs(data, configDir),
    }
  } catch (error) {
    if (error instanceof ModuleRefNotFoundError) {
      return {
        success: false,
        error: error.message,
      }
    }
    /* v8 ignore next -- @preserve: error is always Error from yaml parser; defensive guard */
    const message = error instanceof Error ? error.message : 'Unknown error during module expansion'
    return {
      success: false,
      error: message,
    }
  }
}

function outputResult<T>(data: SuccessOutput<T>, options: ExtractOptions): void {
  if (options.output !== undefined) {
    try {
      writeFileSync(options.output, JSON.stringify(data))
    } catch {
      console.log(
        JSON.stringify(
          formatError(
            CliErrorCode.ValidationError,
            'Failed to write output file: ' + options.output,
          ),
        ),
      )
      process.exit(ExitCode.RuntimeError)
    }
    return
  }

  console.log(JSON.stringify(data))
}

/* v8 ignore start -- @preserve: called from DraftComponentLoadError catch; validation logic tested in draft-component-loader.spec.ts */
function exitWithRuntimeError(message: string): never {
  console.log(JSON.stringify(formatError(CliErrorCode.ValidationError, message)))
  process.exit(ExitCode.RuntimeError)
}
/* v8 ignore stop */

function exitWithConfigValidation(code: CliErrorCode, message: string): never {
  console.log(JSON.stringify(formatError(code, message)))
  process.exit(ExitCode.ConfigValidation)
}

function exitWithExtractionFailure(fieldNames: string[]): never {
  const uniqueFields = [...new Set(fieldNames)]
  console.log(
    JSON.stringify(
      formatError(
        CliErrorCode.ValidationError,
        `Extraction failed for fields: ${uniqueFields.join(', ')}`,
      ),
    ),
  )
  process.exit(ExitCode.ExtractionFailure)
}

function resolveSourceFiles(resolvedConfig: ResolvedExtractionConfig, configDir: string): string[] {
  const sourceFilePaths = resolvedConfig.modules
    .flatMap((module) => globSync(module.path, { cwd: configDir }))
    .map((filePath) => resolve(configDir, filePath))

  if (sourceFilePaths.length === 0) {
    const patterns = resolvedConfig.modules.map((m) => m.path).join(', ')
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `No files matched extraction patterns: ${patterns}\nConfig directory: ${configDir}`,
    )
  }

  return sourceFilePaths
}

interface ValidatedConfig {
  resolvedConfig: ResolvedExtractionConfig
  configDir: string
}

function loadAndValidateConfig(configPath: string): ValidatedConfig {
  if (!existsSync(configPath)) {
    exitWithConfigValidation(CliErrorCode.ConfigNotFound, `Config file not found: ${configPath}`)
  }

  const content = readFileSync(configPath, 'utf-8')
  const parseResult = parseConfigFile(content)

  if (!parseResult.success) {
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `Invalid config file: ${parseResult.error}`,
    )
  }

  const configDir = dirname(resolve(configPath))
  const expansionResult = tryExpandModuleRefs(parseResult.data, configDir)

  if (!expansionResult.success) {
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `Error expanding module references: ${expansionResult.error}`,
    )
  }

  if (!isValidExtractionConfig(expansionResult.data)) {
    const validationResult = validateExtractionConfig(expansionResult.data)
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `Invalid extraction config:\n${formatValidationErrors(validationResult.errors)}`,
    )
  }

  return {
    resolvedConfig: resolveConfig(expansionResult.data, createConfigLoader(configDir)),
    configDir,
  }
}

function rejectMutuallyExclusive(
  flagA: string,
  flagB: string,
  aPresent: boolean,
  bPresent: boolean,
): void {
  if (aPresent && bPresent) {
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `${flagA} and ${flagB} cannot be used together`,
    )
  }
}

function validateMutualExclusions(options: ExtractOptions): void {
  rejectMutuallyExclusive(
    '--components-only',
    '--enrich',
    options.componentsOnly === true,
    options.enrich !== undefined,
  )
  rejectMutuallyExclusive('--pr', '--files', options.pr === true, options.files !== undefined)
  rejectMutuallyExclusive('--pr', '--enrich', options.pr === true, options.enrich !== undefined)
  rejectMutuallyExclusive(
    '--files',
    '--enrich',
    options.files !== undefined,
    options.enrich !== undefined,
  )
}

function validateFormatOption(options: ExtractOptions): void {
  if (options.format !== undefined && options.format !== 'json' && options.format !== 'markdown') {
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      `Invalid format '${options.format}'. Must be 'json' or 'markdown'.`,
    )
  }
  if (options.format === 'markdown' && !options.pr && options.files === undefined) {
    exitWithConfigValidation(
      CliErrorCode.ValidationError,
      '--format markdown requires --pr or --files',
    )
  }
}

function validateFlagCombinations(options: ExtractOptions): void {
  validateMutualExclusions(options)
  if (options.base !== undefined && !options.pr) {
    exitWithConfigValidation(CliErrorCode.ValidationError, '--base can only be used with --pr')
  }
  validateFormatOption(options)
}

function resolveFilteredSourceFiles(allSourceFiles: string[], options: ExtractOptions): string[] {
  try {
    return filterSourceFiles(allSourceFiles, options).files
  } catch (error) {
    /* v8 ignore next -- @preserve: filterSourceFiles only throws SourceFilterError */
    if (!(error instanceof SourceFilterError)) throw error
    if (error.filterErrorKind === 'GIT_ERROR' && error.gitError !== undefined) {
      /* v8 ignore next -- @preserve: GIT_NOT_FOUND requires git absent from system */
      const code =
        error.gitError.gitErrorCode === 'NOT_A_REPOSITORY'
          ? CliErrorCode.GitNotARepository
          : CliErrorCode.GitNotFound
      console.log(JSON.stringify(formatError(code, error.gitError.message)))
      process.exit(ExitCode.RuntimeError)
    }
    exitWithConfigValidation(CliErrorCode.ValidationError, error.message)
  }
}

export function createExtractCommand(): Command {
  return new Command('extract')
    .description('Extract architectural components from source code')
    .requiredOption('--config <path>', 'Path to extraction config file')
    .option('--dry-run', 'Show component counts per domain without full output')
    .option('-o, --output <file>', 'Write output to file instead of stdout')
    .option('--components-only', 'Output only component identity (no metadata enrichment)')
    .option('--enrich <file>', 'Read draft components from file and enrich with extraction rules')
    .option('--allow-incomplete', 'Output components even when some extraction fields fail')
    .option('--pr', 'Extract from files changed in current branch vs base branch')
    .option('--base <branch>', 'Override base branch for --pr (default: auto-detect)')
    .option('--files <paths...>', 'Extract from specific files')
    .option('--format <type>', 'Output format: json (default) or markdown')
    .action((options: ExtractOptions) => {
      validateFlagCombinations(options)

      const {
        resolvedConfig, configDir 
      } = loadAndValidateConfig(options.config)
      const allSourceFilePaths = resolveSourceFiles(resolvedConfig, configDir)
      const sourceFilePaths = resolveFilteredSourceFiles(allSourceFilePaths, options)
      const project = new Project()
      project.addSourceFilesAtPaths(sourceFilePaths)

      const draftComponents = (() => {
        if (options.enrich === undefined) {
          return extractComponents(project, sourceFilePaths, resolvedConfig, matchesGlob, configDir)
        }
        try {
          return loadDraftComponentsFromFile(options.enrich)
          /* v8 ignore start -- @preserve: DraftComponentLoadError handling; validation tested in draft-component-loader.spec.ts */
        } catch (error) {
          if (error instanceof DraftComponentLoadError) {
            exitWithRuntimeError(error.message)
          }
          throw error
        }
        /* v8 ignore stop */
      })()

      /* v8 ignore start -- @preserve: dry-run path tested via CLI integration */
      if (options.dryRun) {
        const lines = formatDryRunOutput(draftComponents)
        for (const line of lines) {
          console.log(line)
        }
        return
      }
      /* v8 ignore stop */

      if (options.format === 'markdown') {
        const markdown = formatPrMarkdown({
          added: draftComponents.map((c) => ({
            type: c.type,
            name: c.name,
            domain: c.domain,
          })),
          modified: [],
          removed: [],
        })
        console.log(markdown)
        return
      }

      if (options.componentsOnly) {
        outputResult(formatSuccess(draftComponents), options)
        return
      }

      const enrichmentResult = enrichComponents(
        draftComponents,
        resolvedConfig,
        project,
        matchesGlob,
        configDir,
      )

      const hasFailures = enrichmentResult.failures.length > 0
      if (hasFailures && options.allowIncomplete === true) {
        outputResult(formatSuccess(enrichmentResult.components), options)
        return
      }

      if (hasFailures) {
        exitWithExtractionFailure(enrichmentResult.failures.map((f) => f.field))
      }

      outputResult(formatSuccess(enrichmentResult.components), options)
    })
}
