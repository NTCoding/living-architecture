import { Command } from 'commander'
import { createRequire } from 'module'
import { AddComponent } from '../features/builder/commands/add-component'
import { AddDomain } from '../features/builder/commands/add-domain'
import { AddSource } from '../features/builder/commands/add-source'
import { CheckConsistency } from '../features/builder/commands/check-consistency'
import { ComponentChecklist } from '../features/builder/commands/component-checklist'
import { ComponentSummary } from '../features/builder/commands/component-summary'
import { DefineCustomType } from '../features/builder/commands/define-custom-type'
import { DefineRelationshipType } from '../features/builder/commands/define-relationship-type'
import { EnrichComponent } from '../features/builder/commands/enrich-component'
import { FinalizeGraph } from '../features/builder/commands/finalize-graph'
import { InitGraph } from '../features/builder/commands/init-graph'
import { LinkComponents } from '../features/builder/commands/link-components'
import { LinkExternal } from '../features/builder/commands/link-external'
import { LinkHttp } from '../features/builder/commands/link-http'
import { ValidateGraph } from '../features/builder/commands/validate-graph'
import { RiviereBuilderRepository } from '../features/builder/data-access/riviere-builder-repository'
import { createAddComponentCommand } from '../features/builder/entrypoint/add-component/entrypoint'
import { createAddDomainCommand } from '../features/builder/entrypoint/add-domain/entrypoint'
import { createAddSourceCommand } from '../features/builder/entrypoint/add-source/entrypoint'
import { createCheckConsistencyCommand } from '../features/builder/entrypoint/check-consistency/entrypoint'
import { createComponentChecklistCommand } from '../features/builder/entrypoint/component-checklist/entrypoint'
import { createComponentSummaryCommand } from '../features/builder/entrypoint/component-summary/entrypoint'
import { createDefineCustomTypeCommand } from '../features/builder/entrypoint/define-custom-type/entrypoint'
import { createDefineRelationshipTypeCommand } from '../features/builder/entrypoint/define-relationship-type/entrypoint'
import { createEnrichCommand } from '../features/builder/entrypoint/enrich/entrypoint'
import { createFinalizeCommand } from '../features/builder/entrypoint/finalize/entrypoint'
import { createInitCommand } from '../features/builder/entrypoint/init/entrypoint'
import { createLinkCommand } from '../features/builder/entrypoint/link/entrypoint'
import { createLinkExternalCommand } from '../features/builder/entrypoint/link-external/entrypoint'
import { createLinkHttpCommand } from '../features/builder/entrypoint/link-http/entrypoint'
import { createValidateCommand } from '../features/builder/entrypoint/validate/entrypoint'
import { EnrichDraftComponents } from '../features/extract/commands/enrich-draft-components'
import { ExtractDraftComponents } from '../features/extract/commands/extract-draft-components'
import { ExtractionProjectRepository } from '../features/extract/data-access/extraction-project/extraction-project-repository'
import { createExtractCommand } from '../features/extract/entrypoint/extract/entrypoint'
import { DetectOrphans } from '../features/query/queries/detect-orphans'
import { ListComponents } from '../features/query/queries/list-components'
import { ListDomains } from '../features/query/queries/list-domains'
import { ListEntryPoints } from '../features/query/queries/list-entry-points'
import { SearchComponents } from '../features/query/queries/search-components'
import { TraceFlow } from '../features/query/queries/trace-flow'
import { RiviereQueryRepository } from '../features/query/data-access/riviere-query-repository'
import { createComponentsCommand } from '../features/query/entrypoint/components/entrypoint'
import { createDomainsCommand } from '../features/query/entrypoint/domains/entrypoint'
import { createEntryPointsCommand } from '../features/query/entrypoint/entry-points/entrypoint'
import { createOrphansCommand } from '../features/query/entrypoint/orphans/entrypoint'
import { createSearchCommand } from '../features/query/entrypoint/search/entrypoint'
import { createTraceCommand } from '../features/query/entrypoint/trace/entrypoint'

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
  builderCmd.addCommand(
    createDefineRelationshipTypeCommand(new DefineRelationshipType(builderRepository)),
  )

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
