import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { Command } from 'commander'
import { createRequire } from 'module'
import { resolve } from 'node:path'
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
import { createInitCommand } from '../features/builder/entrypoint/init/entrypoint'
import { createLinkCommand } from '../features/builder/entrypoint/link/entrypoint'
import { createLinkExternalCommand } from '../features/builder/entrypoint/link-external/entrypoint'
import { createLinkHttpCommand } from '../features/builder/entrypoint/link-http/entrypoint'
import { createValidateCommand } from '../features/builder/entrypoint/validate/entrypoint'
import { EnrichDraftComponents } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/enrich-draft-components'
import { ExtractDraftComponents } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/commands/extract-draft-components'
import { RiviereProjectRepository } from '@living-architecture/riviere-extract-ts-use-cases/features/extract/data-access/riviere-project/riviere-project-repository'
import { createExtractCommand } from '../features/extract/entrypoint/extract/entrypoint'
import { GitError } from '../infra/cli/presentation/git-error'
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
  const projectRoot = process.cwd()

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

  queryCmd.addCommand(createEntryPointsCommand(new ListEntryPoints(new EntryPointListLoader())))
  queryCmd.addCommand(createDomainsCommand(new ListDomains(new DomainListLoader())))
  queryCmd.addCommand(createTraceCommand(new TraceFlow(new FlowTraceLoader())))
  queryCmd.addCommand(createOrphansCommand(new DetectOrphans(new OrphanListLoader())))
  queryCmd.addCommand(createComponentsCommand(new ListComponents(new ComponentListLoader())))
  queryCmd.addCommand(createSearchCommand(new SearchComponents(new ComponentSearchLoader())))

  program.addCommand(
    createExtractCommand(
      new ExtractDraftComponents(riviereProjectRepository),
      new EnrichDraftComponents(riviereProjectRepository),
      {
        draftComponentsLoader: {
          readFile: (filePath) => readFileSync(filePath, 'utf8'),
        },
        sourceFileSelection: {
          fileExists: existsSync,
          projectRoot,
          resolvePath: (filePath) => resolve(projectRoot, filePath),
          runGit: (args) => {
            try {
              const gitExecutable = process.env['GIT_EXECUTABLE'] ?? 'git'
              return execFileSync(gitExecutable, args, {
                cwd: projectRoot,
                env: Object.fromEntries(
                  Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')),
                ),
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
              })
            } catch (error) {
              const stderr = String(Reflect.get(Object(error), 'stderr'))
              if (args[0] === 'rev-parse' || stderr.includes('not a git repository')) {
                throw new GitError('Run from within a git repository.')
              }
              throw error
            }
          },
        },
      },
    ),
  )

  return program
}
