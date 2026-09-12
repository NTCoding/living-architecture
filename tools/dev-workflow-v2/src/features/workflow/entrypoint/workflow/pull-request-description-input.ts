import { z } from 'zod'
import type { CreatePullRequestInput } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-workflow-routes'

const CREATE_PR_COMMAND_TOKENS_SCHEMA = z.array(z.string())
const OPTION_SUCCESS_SCHEMA = z.object({ ok: z.literal(true), value: z.string() })

const PULL_REQUEST_OPTION_NAMES: readonly string[] = [
  '--commit-type',
  '--commit-scope',
  '--title',
  '--description',
  '--problem',
  '--acceptance-criteria',
  '--key-changes',
  '--architecture-impact',
  '--validation',
  '--notes',
]

type PullRequestOptionParseResult =
  | { readonly ok: true; readonly input: CreatePullRequestInput }
  | { readonly ok: false; readonly reason: string }

type OptionValueResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly reason: string }

type PullRequestOptionValueResults = Record<keyof CreatePullRequestInput, OptionValueResult>

/** @riviere-role entrypoint-cli-input-parser */
export function parsePullRequestDescriptionOptions(rawArgs: unknown): PullRequestOptionParseResult {
  const parsedTokens = CREATE_PR_COMMAND_TOKENS_SCHEMA.safeParse(rawArgs)
  if (!parsedTokens.success) {
    return {
      ok: false,
      reason: 'Expected create-pr arguments to be option/value string pairs.',
    }
  }
  const commandTokens = parsedTokens.data
  const tokenValidationReason = validateOptionTokens(commandTokens)
  if (tokenValidationReason !== undefined) {
    return {
      ok: false,
      reason: tokenValidationReason,
    }
  }
  return parsePullRequestDescriptionInput(readPullRequestOptionValues(commandTokens))
}

function readPullRequestOptionValues(
  commandTokens: readonly string[],
): PullRequestOptionValueResults {
  return {
    commitType: readRequiredOption(commandTokens, '--commit-type'),
    commitScope: readRequiredOption(commandTokens, '--commit-scope'),
    title: readRequiredOption(commandTokens, '--title'),
    description: readRequiredOption(commandTokens, '--description'),
    problem: readRequiredOption(commandTokens, '--problem'),
    acceptanceCriteria: readRequiredOption(commandTokens, '--acceptance-criteria'),
    keyChanges: readRequiredOption(commandTokens, '--key-changes'),
    architectureImpact: readRequiredOption(commandTokens, '--architecture-impact'),
    validation: readRequiredOption(commandTokens, '--validation'),
    notes: readRequiredOption(commandTokens, '--notes'),
  }
}

function parsePullRequestDescriptionInput(
  optionValueResults: PullRequestOptionValueResults,
): PullRequestOptionParseResult {
  const failedOptionResult = Object.values(optionValueResults).find(
    (optionResult) => !optionResult.ok,
  )
  if (failedOptionResult !== undefined && !failedOptionResult.ok) {
    return {
      ok: false,
      reason: failedOptionResult.reason,
    }
  }
  return {
    ok: true,
    input: {
      commitType: readSuccessfulOptionValue(optionValueResults.commitType),
      commitScope: readSuccessfulOptionValue(optionValueResults.commitScope),
      title: readSuccessfulOptionValue(optionValueResults.title),
      description: readSuccessfulOptionValue(optionValueResults.description),
      problem: readSuccessfulOptionValue(optionValueResults.problem),
      acceptanceCriteria: readSuccessfulOptionValue(optionValueResults.acceptanceCriteria),
      keyChanges: readSuccessfulOptionValue(optionValueResults.keyChanges),
      architectureImpact: readSuccessfulOptionValue(optionValueResults.architectureImpact),
      validation: readSuccessfulOptionValue(optionValueResults.validation),
      notes: readSuccessfulOptionValue(optionValueResults.notes),
    },
  }
}

function readSuccessfulOptionValue(optionValueResult: OptionValueResult): string {
  return OPTION_SUCCESS_SCHEMA.parse(optionValueResult).value
}

function validateOptionTokens(commandTokens: readonly string[]): string | undefined {
  if (commandTokens.length === 0) {
    return `Expected create-pr options: ${PULL_REQUEST_OPTION_NAMES.join(', ')}.`
  }
  if (commandTokens.length % 2 !== 0) {
    return `Expected value after ${String(commandTokens.at(-1))}.`
  }
  const optionTokens = commandTokens.filter((_commandToken, index) => index % 2 === 0)
  const unknownOption = optionTokens.find(
    (optionToken) => !PULL_REQUEST_OPTION_NAMES.includes(optionToken),
  )
  if (unknownOption !== undefined) {
    return `Unknown create-pr option ${unknownOption}. Allowed options: ${PULL_REQUEST_OPTION_NAMES.join(', ')}.`
  }
  const duplicateOption = optionTokens.find(
    (optionToken, index) => optionTokens.indexOf(optionToken) !== index,
  )
  if (duplicateOption !== undefined) {
    return `Duplicate create-pr option ${duplicateOption}.`
  }
  return undefined
}

function readRequiredOption(
  commandTokens: readonly string[],
  optionName: string,
): OptionValueResult {
  const optionIndex = commandTokens.findIndex(
    (commandToken, index) => index % 2 === 0 && commandToken === optionName,
  )
  if (optionIndex < 0) {
    return {
      ok: false,
      reason: `Missing required create-pr option ${optionName}.`,
    }
  }
  const optionValue = z.string().parse(commandTokens.at(optionIndex + 1))
  if (optionValue.trim().length === 0) {
    return {
      ok: false,
      reason: `Expected non-empty value for ${optionName}.`,
    }
  }
  return {
    ok: true,
    value: optionValue,
  }
}
