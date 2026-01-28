import { Command } from 'commander'
import { createRequire } from 'module'
import { InvalidPackageJsonError } from './errors'
import { createAddComponentCommand } from './features/builder/add-component'
import { createAddDomainCommand } from './features/builder/add-domain'
import { createAddSourceCommand } from './features/builder/add-source'
import { createInitCommand } from './features/builder/init'
import { createLinkCommand } from './features/builder/link'
import { createLinkExternalCommand } from './features/builder/link-external'
import { createLinkHttpCommand } from './features/builder/link-http'
import { createValidateCommand } from './features/builder/validate'
import { createFinalizeCommand } from './features/builder/finalize'
import { createEnrichCommand } from './features/builder/enrich'
import { createComponentSummaryCommand } from './features/builder/component-summary'
import { createComponentChecklistCommand } from './features/builder/component-checklist'
import { createCheckConsistencyCommand } from './features/builder/check-consistency'
import { createDefineCustomTypeCommand } from './features/builder/define-custom-type'
import { createEntryPointsCommand } from './features/query/entry-points'
import { createDomainsCommand } from './features/query/domains'
import { createTraceCommand } from './features/query/trace'
import { createOrphansCommand } from './features/query/orphans'
import { createComponentsCommand } from './features/query/components'
import { createSearchCommand } from './features/query/search'
import { createExtractCommand } from './features/extract/extract'

interface PackageJson {version: string}

/**
 * Parses and validates package.json data.
 * @param pkg - Raw package.json content.
 * @returns Validated package.json with version.
 * @throws Error if package.json is invalid.
 */
export function parsePackageJson(pkg: unknown): PackageJson {
  if (typeof pkg !== 'object' || pkg === null || !('version' in pkg)) {
    throw new InvalidPackageJsonError('missing version field')
  }
  if (typeof pkg.version !== 'string') {
    throw new InvalidPackageJsonError('version must be a string')
  }
  return { version: pkg.version }
}

function loadPackageJson(): PackageJson {
  const require = createRequire(import.meta.url)
  return parsePackageJson(require('../package.json'))
}

const packageJson = loadPackageJson()

/**
 * Creates and configures the CLI program with all commands.
 * @returns Configured Commander program.
 */
export function createProgram(): Command {
  const program = new Command()

  program.name('riviere').version(packageJson.version)

  const builderCmd = program.command('builder').description('Commands for building a graph')

  builderCmd.addCommand(createAddComponentCommand())
  builderCmd.addCommand(createAddDomainCommand())
  builderCmd.addCommand(createAddSourceCommand())
  builderCmd.addCommand(createInitCommand())
  builderCmd.addCommand(createLinkCommand())
  builderCmd.addCommand(createLinkExternalCommand())
  builderCmd.addCommand(createLinkHttpCommand())
  builderCmd.addCommand(createValidateCommand())
  builderCmd.addCommand(createFinalizeCommand())
  builderCmd.addCommand(createEnrichCommand())
  builderCmd.addCommand(createComponentSummaryCommand())
  builderCmd.addCommand(createComponentChecklistCommand())
  builderCmd.addCommand(createCheckConsistencyCommand())
  builderCmd.addCommand(createDefineCustomTypeCommand())

  const queryCmd = program.command('query').description('Commands for querying a graph')

  queryCmd.addCommand(createEntryPointsCommand())
  queryCmd.addCommand(createDomainsCommand())
  queryCmd.addCommand(createTraceCommand())
  queryCmd.addCommand(createOrphansCommand())
  queryCmd.addCommand(createComponentsCommand())
  queryCmd.addCommand(createSearchCommand())

  program.addCommand(createExtractCommand())

  return program
}
