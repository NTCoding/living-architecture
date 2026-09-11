import { z } from 'zod'
import type { PullRequestDescriptionInput } from '@living-architecture/dev-workflow-v2-use-cases/commands/create-workflow-routes'

const CREATE_PR_COMMAND_TOKENS_SCHEMA = z.array(z.string())
const MINIMUM_PULL_REQUEST_DESCRIPTION_LENGTH = 100
const MAXIMUM_PULL_REQUEST_TITLE_LENGTH = 100
const OPTION_SUCCESS_SCHEMA = z.object({ ok: z.literal(true), value: z.string() })

const CONVENTIONAL_COMMIT_TYPES: readonly string[] = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
]

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
  | { readonly ok: true; readonly input: PullRequestDescriptionInput }
  | { readonly ok: false; readonly reason: string }

type OptionValueResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly reason: string }

type PullRequestOptionValueResults = Record<keyof PullRequestDescriptionInput, OptionValueResult>

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
  return buildPullRequestDescriptionInput(readPullRequestOptionValues(commandTokens))
}

function readPullRequestOptionValues(
  commandTokens: readonly string[],
): PullRequestOptionValueResults {
  return {
    commitType: readCommitType(commandTokens),
    commitScope: readRequiredOption(commandTokens, '--commit-scope'),
    title: readTitle(commandTokens),
    description: readRequiredDescription(commandTokens),
    problem: readRequiredOption(commandTokens, '--problem'),
    acceptanceCriteria: readRequiredOption(commandTokens, '--acceptance-criteria'),
    keyChanges: readRequiredOption(commandTokens, '--key-changes'),
    architectureImpact: readRequiredOption(commandTokens, '--architecture-impact'),
    validation: readRequiredOption(commandTokens, '--validation'),
    notes: readRequiredOption(commandTokens, '--notes'),
  }
}

function buildPullRequestDescriptionInput(
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
  const input = {
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
  }
  const composedTitle = `${input.commitType}(${input.commitScope}): ${input.title}`
  if (composedTitle.length > MAXIMUM_PULL_REQUEST_TITLE_LENGTH) {
    return {
      ok: false,
      reason: `Expected composed pull request title to be at most ${MAXIMUM_PULL_REQUEST_TITLE_LENGTH} characters.`,
    }
  }
  return {
    ok: true,
    input,
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

function readTitle(commandTokens: readonly string[]): OptionValueResult {
  const title = readRequiredOption(commandTokens, '--title')
  if (!title.ok) {
    return title
  }
  if (title.value.endsWith('.')) {
    return {
      ok: false,
      reason: 'Expected --title to not end with a full stop.',
    }
  }
  return title
}

function readRequiredDescription(commandTokens: readonly string[]): OptionValueResult {
  const description = readRequiredOption(commandTokens, '--description')
  if (!description.ok) {
    return description
  }
  if (description.value.trim().length < MINIMUM_PULL_REQUEST_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      reason: `Expected --description to be at least ${MINIMUM_PULL_REQUEST_DESCRIPTION_LENGTH} characters.`,
    }
  }
  return description
}

function readCommitType(commandTokens: readonly string[]): OptionValueResult {
  const commitType = readRequiredOption(commandTokens, '--commit-type')
  if (!commitType.ok) {
    return commitType
  }
  if (!CONVENTIONAL_COMMIT_TYPES.includes(commitType.value)) {
    return {
      ok: false,
      reason: `Expected --commit-type to be one of: ${CONVENTIONAL_COMMIT_TYPES.join(', ')}.`,
    }
  }
  return commitType
}
