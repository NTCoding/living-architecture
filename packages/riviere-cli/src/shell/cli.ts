import { Command } from 'commander'
import { createRequire } from 'module'
import { AddComponent } from '../features/builder/commands/add-component'
import { AddDomain } from '../features/builder/commands/add-domain'
import { AddSource } from '../features/builder/commands/add-source'
import { CheckConsistency } from '../features/builder/commands/check-consistency'
import { ComponentChecklist } from '../features/builder/commands/component-checklist'
import { ComponentSummary } from '../features/builder/commands/component-summary'
import { DefineCustomType } from '../features/builder/commands/define-custom-type'
import { EnrichComponent } from '../features/builder/commands/enrich-component'
import { FinalizeGraph } from '../features/builder/commands/finalize-graph'
import { InitGraph } from '../features/builder/commands/init-graph'
import { LinkComponents } from '../features/builder/commands/link-components'
import { LinkExternal } from '../features/builder/commands/link-external'
import { LinkHttp } from '../features/builder/commands/link-http'
import { ValidateGraph } from '../features/builder/commands/validate-graph'
import { RiviereBuilderRepository } from '../features/builder/infra/persistence/riviere-builder-repository'
import { createAddComponentCommand } from '../features/builder/entrypoint/add-component'
import { createAddDomainCommand } from '../features/builder/entrypoint/add-domain'
import { createAddSourceCommand } from '../features/builder/entrypoint/add-source'
import { createCheckConsistencyCommand } from '../features/builder/entrypoint/check-consistency'
import { createComponentChecklistCommand } from '../features/builder/entrypoint/component-checklist'
import { createComponentSummaryCommand } from '../features/builder/entrypoint/component-summary'
import { createDefineCustomTypeCommand } from '../features/builder/entrypoint/define-custom-type'
import { createEnrichCommand } from '../features/builder/entrypoint/enrich'
import { createFinalizeCommand } from '../features/builder/entrypoint/finalize'
import { createInitCommand } from '../features/builder/entrypoint/init'
import { createLinkCommand } from '../features/builder/entrypoint/link'
import { createLinkExternalCommand } from '../features/builder/entrypoint/link-external'
import { createLinkHttpCommand } from '../features/builder/entrypoint/link-http'
import { createValidateCommand } from '../features/builder/entrypoint/validate'
import { EnrichDraftComponents } from '../features/extract/commands/enrich-draft-components'
import { ExtractDraftComponents } from '../features/extract/commands/extract-draft-components'
import { ExtractionProjectRepository } from '../features/extract/infra/persistence/extraction-project/extraction-project-repository'
import { createExtractCommand } from '../features/extract/entrypoint/extract'
import { DetectOrphans } from '../features/query/queries/detect-orphans'
import { ListComponents } from '../features/query/queries/list-components'
import { ListDomains } from '../features/query/queries/list-domains'
import { ListEntryPoints } from '../features/query/queries/list-entry-points'
import { SearchComponents } from '../features/query/queries/search-components'
import { TraceFlow } from '../features/query/queries/trace-flow'
import { RiviereQueryRepository } from '../features/query/infra/persistence/riviere-query-repository'
import { createComponentsCommand } from '../features/query/entrypoint/components'
import { createDomainsCommand } from '../features/query/entrypoint/domains'
import { createEntryPointsCommand } from '../features/query/entrypoint/entry-points'
import { createOrphansCommand } from '../features/query/entrypoint/orphans'
import { createSearchCommand } from '../features/query/entrypoint/search'
import { createTraceCommand } from '../features/query/entrypoint/trace'

interface PackageJson {version: string}

class InvalidPackageJsonError extends Error {
  constructor(reason: string) {
    super(`Invalid package.json: ${reason}`)
    this.name = 'InvalidPackageJsonError'
  }
}

function parsePackageJson(pkg: unknown): PackageJson {
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

/** @riviere-role main */
export function createProgram(): Command {
  const builderRepository = new RiviereBuilderRepository()
  const queryRepository = new RiviereQueryRepository()
  const extractionProjectRepository = new ExtractionProjectRepository()

  const program = new Command()

  program.name('riviere').version(packageJson.version)

  const builderCmd = program.command('builder').description('Commands for building a graph')

  builderCmd.addCommand(createAddComponentCommand(new AddComponent(builderRepository)))
  builderCmd.addCommand(createAddDomainCommand(new AddDomain(builderRepository)))
  builderCmd.addCommand(createAddSourceCommand(new AddSource(builderRepository)))
  builderCmd.addCommand(createInitCommand(new InitGraph(builderRepository)))
  builderCmd.addCommand(createLinkCommand(new LinkComponents(builderRepository)))
  builderCmd.addCommand(createLinkExternalCommand(new LinkExternal(builderRepository)))
  builderCmd.addCommand(createLinkHttpCommand(new LinkHttp(builderRepository)))
  builderCmd.addCommand(createValidateCommand(new ValidateGraph(builderRepository)))
  builderCmd.addCommand(createFinalizeCommand(new FinalizeGraph(builderRepository)))
  builderCmd.addCommand(createEnrichCommand(new EnrichComponent(builderRepository)))
  builderCmd.addCommand(createComponentSummaryCommand(new ComponentSummary(builderRepository)))
  builderCmd.addCommand(createComponentChecklistCommand(new ComponentChecklist(builderRepository)))
  builderCmd.addCommand(createCheckConsistencyCommand(new CheckConsistency(builderRepository)))
  builderCmd.addCommand(createDefineCustomTypeCommand(new DefineCustomType(builderRepository)))

  const queryCmd = program.command('query').description('Commands for querying a graph')

  queryCmd.addCommand(createEntryPointsCommand(new ListEntryPoints(queryRepository)))
  queryCmd.addCommand(createDomainsCommand(new ListDomains(queryRepository)))
  queryCmd.addCommand(createTraceCommand(new TraceFlow(queryRepository)))
  queryCmd.addCommand(createOrphansCommand(new DetectOrphans(queryRepository)))
  queryCmd.addCommand(createComponentsCommand(new ListComponents(queryRepository)))
  queryCmd.addCommand(createSearchCommand(new SearchComponents(queryRepository)))

  program.addCommand(
    createExtractCommand(
      new ExtractDraftComponents(extractionProjectRepository),
      new EnrichDraftComponents(extractionProjectRepository),
    ),
  )

  return program
}
