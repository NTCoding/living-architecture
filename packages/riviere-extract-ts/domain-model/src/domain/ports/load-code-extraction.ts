import type {
  CodeExtractionConfig,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import type { Project } from 'ts-morph'

type CodeExtractionModuleContext = Readonly<{
  readonly module: ValidatedModule
  readonly files: readonly string[]
  readonly project: Project
}>

/**
 * Creates the compiler-backed module contexts needed for one code-extraction stage.
 * The returned state is owned by the caller for the duration of that stage only.
 *
 * @riviere-role domain-port
 * @riviere-role-justification The compiler-backed module contexts are stage-scoped runtime input, not aggregate state previously created and persisted by the Project repository.
 */
export type LoadCodeExtraction = (input: {
  readonly config: CodeExtractionConfig
  readonly configPath: string
  readonly repositoryName: string
  readonly useTsConfig: boolean
}) => readonly CodeExtractionModuleContext[]
