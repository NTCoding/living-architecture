import { Command } from 'commander'
import { createRequire } from 'module'
import { InvalidPackageJsonError } from './errors/errors'
import { createAddComponentCommand } from '../features/builder/entrypoint/add-component'
import { createAddDomainCommand } from '../features/builder/entrypoint/add-domain'
import { createAddSourceCommand } from '../features/builder/entrypoint/add-source'
import { createInitCommand } from '../features/builder/entrypoint/init'
import { createLinkCommand } from '../features/builder/entrypoint/link'
import { createLinkExternalCommand } from '../features/builder/entrypoint/link-external'
import { createLinkHttpCommand } from '../features/builder/entrypoint/link-http'
import { createValidateCommand } from '../features/builder/entrypoint/validate'
import { createFinalizeCommand } from '../features/builder/entrypoint/finalize'
import { createEnrichCommand } from '../features/builder/entrypoint/enrich'
import { createComponentSummaryCommand } from '../features/builder/entrypoint/component-summary'
import { createComponentChecklistCommand } from '../features/builder/entrypoint/component-checklist'
import { createCheckConsistencyCommand } from '../features/builder/entrypoint/check-consistency'
import { createDefineCustomTypeCommand } from '../features/builder/entrypoint/define-custom-type'
import { createEntryPointsCommand } from '../features/query/entrypoint/entry-points'
import { createDomainsCommand } from '../features/query/entrypoint/domains'
import { createTraceCommand } from '../features/query/entrypoint/trace'
import { createOrphansCommand } from '../features/query/entrypoint/orphans'
import { createComponentsCommand } from '../features/query/entrypoint/components'
import { createSearchCommand } from '../features/query/entrypoint/search'
import { createExtractCommand } from '../features/extract/entrypoint/extract'

interface PackageJson {version: string}

export function parsePackageJson(pkg: unknown): PackageJson {
  if (typeof pkg !== 'object' || pkg === null || !('version' in pkg)) {
    throw new InvalidPackageJsonError('missing version field')
  }
  if (typeof pkg.version !== 'string') {
    throw new InvalidPackageJsonError('version must be a string')
  }
  return { version: pkg.version }
}

declare const INJECTED_VERSION: string | undefined

function loadPackageJson(): PackageJson {
  if (typeof INJECTED_VERSION === 'string') {
    return { version: INJECTED_VERSION }
  }
  const require = createRequire(import.meta.url)
  return parsePackageJson(require('../../package.json'))
}

const packageJson = loadPackageJson()

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
