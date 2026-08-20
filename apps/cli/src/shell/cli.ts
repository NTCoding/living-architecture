import { Command } from 'commander'
import { getDefaultGraphPathDescription } from '../infra/cli/presentation/graph-path-option'
import { parseAddComponentInput } from '../features/builder/entrypoint/add-component/parse-add-component-input'
import { formatError, formatSuccess } from '../infra/cli/presentation/output'
import { getAddComponentHints } from '../infra/cli/presentation/add-component-hints'
import { parsePropertySpecs } from '../features/builder/entrypoint/define-custom-type/custom-type-parser'
import { parseStateChanges } from '../features/builder/entrypoint/enrich/enrichment-parser'
import { parseSignature } from '../features/builder/entrypoint/enrich/signature-parser'
import { parseLinkSourceLocation } from '../features/builder/entrypoint/link/link-source-location-options'
import { parseFlagCombinations } from '../features/extract/entrypoint/extract/extract-validator'
import { createExtractDraftComponentsInput } from '../features/extract/entrypoint/extract/create-extract-draft-components-input'
import { createEnrichDraftComponentsInput } from '../features/extract/entrypoint/extract/create-enrich-draft-components-input'
import { exitWithCliError } from '../infra/cli/presentation/exit-with-cli-error'
import {
  dataAccessCliErrorCode,
  presentExtractionResult,
  presentExtractionWarnings,
} from '../features/extract/entrypoint/extract/present-extraction-result'
import { formatQueryGraphLoadFailure } from '../infra/cli/presentation/query-graph-load-failure-output'
import { toComponentOutput } from '../infra/cli/presentation/component-output'
import { createRequire } from 'module'
import { AddComponent } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/add-component'
import { AddDomain } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/add-domain'
import { AddSource } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/add-source'
import { CheckConsistency } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/check-consistency'
import { ComponentChecklist } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/component-checklist'
import { ComponentSummary } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/component-summary'
import { DefineCustomType } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/define-custom-type'
import { DefineRelationshipType } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/define-relationship-type'
import { EnrichComponent } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/enrich-component'
import { FinalizeGraph } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/finalize-graph'
import { InitGraph } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/init-graph'
import { LinkComponents } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/link-components'
import { LinkExternal } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/link-external'
import { LinkHttp } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/link-http'
import { ValidateGraph } from '@living-architecture/riviere-builder-use-cases/features/builder/commands/validate-graph'
import { RiviereBuilderRepository } from '@living-architecture/riviere-builder-use-cases/features/builder/data-access/riviere-builder/riviere-builder-repository'
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
import { createFinalizeGraphInput } from '../features/builder/entrypoint/finalize/create-finalize-graph-input'
import { writeFinalizedGraph } from '../features/builder/entrypoint/finalize/write-finalized-graph'
import { createInitCommand } from '../features/builder/entrypoint/init/entrypoint'
import { createLinkCommand } from '../features/builder/entrypoint/link/entrypoint'
import { createLinkExternalCommand } from '../features/builder/entrypoint/link-external/entrypoint'
import { createLinkHttpCommand } from '../features/builder/entrypoint/link-http/entrypoint'
import { createValidateCommand } from '../features/builder/entrypoint/validate/entrypoint'
import { EnrichDraftComponents } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/enrich-draft-components'
import { ExtractDraftComponents } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components'
import { RiviereProjectRepository } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/data-access/riviere-project/riviere-project-repository'
import { createGitChangedSourceFileFinder } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/adapters/git/create-git-changed-source-file-finder'
import { createSpecifiedSourceFileFinder } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/adapters/filesystem/create-specified-source-file-finder'
import { createExtractCommand } from '../features/extract/entrypoint/extract/entrypoint'
import { parseSourceFileSelection } from '../features/extract/entrypoint/extract/parse-source-file-selection'
import { createDraftComponentsLoader } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/adapters/filesystem/create-draft-components-loader'
import { detectChangedTypeScriptFiles } from '@living-architecture/riviere-extract-ts-use-cases/infra/external-clients/git/git-changed-files'
import { findSpecifiedSourceFiles } from '@living-architecture/riviere-extract-ts-use-cases/infra/external-clients/filesystem/find-specified-source-files'
import { DetectOrphans } from '@living-architecture/riviere-builder-use-cases/features/query/queries/detect-orphans'
import { ListComponents } from '@living-architecture/riviere-builder-use-cases/features/query/queries/list-components'
import { ListDomains } from '@living-architecture/riviere-builder-use-cases/features/query/queries/list-domains'
import { ListEntryPoints } from '@living-architecture/riviere-builder-use-cases/features/query/queries/list-entry-points'
import { SearchComponents } from '@living-architecture/riviere-builder-use-cases/features/query/queries/search-components'
import { TraceFlow } from '@living-architecture/riviere-builder-use-cases/features/query/queries/trace-flow'
import {
  ComponentListLoader,
  ComponentSearchLoader,
  DomainListLoader,
  EntryPointListLoader,
  FlowTraceLoader,
  OrphanListLoader,
} from '@living-architecture/riviere-builder-use-cases/features/query/data-access/graph/query-loaders'
import { createComponentsCommand } from '../features/query/entrypoint/components/entrypoint'
import { createDomainsCommand } from '../features/query/entrypoint/domains/entrypoint'
import { createEntryPointsCommand } from '../features/query/entrypoint/entry-points/entrypoint'
import { createOrphansCommand } from '../features/query/entrypoint/orphans/entrypoint'
import { createSearchCommand } from '../features/query/entrypoint/search/entrypoint'
import { createTraceCommand } from '../features/query/entrypoint/trace/entrypoint'

// DO NOT PUT DEPENDENCY IMPLEMENTATIONS IN THIS FILE.
// The shell only composes named collaborators for CLI entrypoints. If you are tempted to
// implement one here, read .riviere/role-definitions/cli-entrypoint-dependencies.md first.

interface PackageJson {
  version: string
}

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

/**
 * Wires the CLI entrypoints to their use cases and adapters.
 *
 * @riviere-role main
 * @returns Configured Rivière CLI program
 */
export function createProgram(): Command {
  const builderRepository = new RiviereBuilderRepository()
  const riviereProjectRepository = new RiviereProjectRepository()
  const program = new Command()

  program.name('riviere').version(packageJson.version)

  const builderCmd = program.command('builder').description('Commands for building a graph')

  builderCmd.addCommand(
    createAddComponentCommand({
      addComponent: new AddComponent(builderRepository),
      getDefaultGraphPathDescription,
      parseAddComponentInput,
      formatError,
      getAddComponentHints,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createAddDomainCommand({
      addDomain: new AddDomain(builderRepository),
      getDefaultGraphPathDescription,
      formatError,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createAddSourceCommand({
      addSource: new AddSource(builderRepository),
      getDefaultGraphPathDescription,
      formatError,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createInitCommand({
      initGraph: new InitGraph(builderRepository),
      getDefaultGraphPathDescription,
      formatError,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createLinkCommand({
      linkComponents: new LinkComponents(builderRepository),
      getDefaultGraphPathDescription,
      parseLinkSourceLocation,
      formatError,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createLinkExternalCommand({
      linkExternal: new LinkExternal(builderRepository),
      getDefaultGraphPathDescription,
      formatError,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createLinkHttpCommand({
      linkHttp: new LinkHttp(builderRepository),
      getDefaultGraphPathDescription,
      formatError,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createValidateCommand({
      validateGraph: new ValidateGraph(builderRepository),
      getDefaultGraphPathDescription,
      formatError,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createFinalizeCommand({
      createFinalizeGraphInput,
      finalizeGraph: new FinalizeGraph(builderRepository),
      getDefaultGraphPathDescription,
      formatError,
      formatSuccess,
      writeFinalizedGraph,
    }),
  )
  builderCmd.addCommand(
    createEnrichCommand({
      enrichComponent: new EnrichComponent(builderRepository),
      getDefaultGraphPathDescription,
      parseStateChanges,
      formatError,
      parseSignature,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createComponentSummaryCommand({
      componentSummary: new ComponentSummary(builderRepository),
      getDefaultGraphPathDescription,
      formatError,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createComponentChecklistCommand({
      componentChecklist: new ComponentChecklist(builderRepository),
      getDefaultGraphPathDescription,
      formatError,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createCheckConsistencyCommand({
      checkConsistency: new CheckConsistency(builderRepository),
      getDefaultGraphPathDescription,
      formatError,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createDefineCustomTypeCommand({
      defineCustomType: new DefineCustomType(builderRepository),
      getDefaultGraphPathDescription,
      parsePropertySpecs,
      formatError,
      formatSuccess,
    }),
  )
  builderCmd.addCommand(
    createDefineRelationshipTypeCommand({
      defineRelationshipType: new DefineRelationshipType(builderRepository),
      getDefaultGraphPathDescription,
      formatError,
      formatSuccess,
    }),
  )

  const queryCmd = program.command('query').description('Commands for querying a graph')

  queryCmd.addCommand(
    createEntryPointsCommand({
      listEntryPoints: new ListEntryPoints(new EntryPointListLoader()),
      getDefaultGraphPathDescription,
      formatQueryGraphLoadFailure,
      formatSuccess,
    }),
  )
  queryCmd.addCommand(
    createDomainsCommand({
      listDomains: new ListDomains(new DomainListLoader()),
      getDefaultGraphPathDescription,
      formatQueryGraphLoadFailure,
      formatSuccess,
    }),
  )
  queryCmd.addCommand(
    createTraceCommand({
      traceFlow: new TraceFlow(new FlowTraceLoader()),
      getDefaultGraphPathDescription,
      formatQueryGraphLoadFailure,
      formatError,
      formatSuccess,
    }),
  )
  queryCmd.addCommand(
    createOrphansCommand({
      detectOrphans: new DetectOrphans(new OrphanListLoader()),
      getDefaultGraphPathDescription,
      formatQueryGraphLoadFailure,
      formatSuccess,
    }),
  )
  queryCmd.addCommand(
    createComponentsCommand({
      listComponents: new ListComponents(new ComponentListLoader()),
      getDefaultGraphPathDescription,
      formatError,
      formatQueryGraphLoadFailure,
      formatSuccess,
      toComponentOutput,
    }),
  )
  queryCmd.addCommand(
    createSearchCommand({
      searchComponents: new SearchComponents(new ComponentSearchLoader()),
      getDefaultGraphPathDescription,
      formatQueryGraphLoadFailure,
      formatSuccess,
      toComponentOutput,
    }),
  )

  program.addCommand(
    createExtractCommand({
      extractDraftComponents: new ExtractDraftComponents(
        riviereProjectRepository,
        createGitChangedSourceFileFinder(process.cwd(), detectChangedTypeScriptFiles),
        createSpecifiedSourceFileFinder(process.cwd(), findSpecifiedSourceFiles),
      ),
      enrichDraftComponents: new EnrichDraftComponents(
        riviereProjectRepository,
        createDraftComponentsLoader(),
      ),
      parseFlagCombinations,
      createExtractDraftComponentsInput,
      createEnrichDraftComponentsInput,
      exitWithCliError,
      dataAccessCliErrorCode,
      presentExtractionResult,
      presentExtractionWarnings,
      parseSourceFileSelection,
    }),
  )

  return program
}
