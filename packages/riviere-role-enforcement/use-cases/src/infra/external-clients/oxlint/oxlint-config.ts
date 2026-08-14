/** @riviere-role external-client-model */
export interface OxlintConfig {
  ignorePatterns: readonly string[]
  jsPlugins: Array<{
    name: string
    specifier: string
  }>
  plugins: readonly string[]
  rules: Record<string, unknown>
}

interface RunOxlintInput {
  config: OxlintConfig
  configDir: string
  lintTargets: readonly string[]
}

interface RunOxlintResult {
  exitCode: number
  stderr: string
  stdout: string
}

/** @riviere-role external-client-model */
export type OxlintClient = (input: RunOxlintInput) => RunOxlintResult
