import { z } from 'zod'

const CREATE_PR_COMMAND_TOKENS_SCHEMA = z.array(z.string())
const MINIMUM_PULL_REQUEST_DESCRIPTION_LENGTH = 100
const OPTION_SUCCESS_SCHEMA = z.object({
  ok: z.literal(true),
  value: z.string(),
})

const PULL_REQUEST_OPTION_NAMES: readonly string[] = [
  '--title',
  '--description',
  '--problem',
  '--acceptance-criteria',
  '--key-changes',
  '--architecture-impact',
  '--validation',
  '--notes',
]

type PullRequestDescriptionInput = {
  readonly title: string
  readonly description: string
  readonly problem: string
  readonly acceptanceCriteria: string
  readonly keyChanges: string
  readonly architectureImpact: string
  readonly validation: string
  readonly notes: string
}

type PullRequestOptionParseResult =
  | {
      readonly ok: true
      readonly input: PullRequestDescriptionInput
    }
  | {
      readonly ok: false
      readonly reason: string
    }

type OptionValueResult =
  | {
      readonly ok: true
      readonly value: string
    }
  | {
      readonly ok: false
      readonly reason: string
    }

type PullRequestOptionValueResults = {
  readonly title: OptionValueResult
  readonly description: OptionValueResult
  readonly problem: OptionValueResult
  readonly acceptanceCriteria: OptionValueResult
  readonly keyChanges: OptionValueResult
  readonly architectureImpact: OptionValueResult
  readonly validation: OptionValueResult
  readonly notes: OptionValueResult
}

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
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

  const title = readRequiredOption(commandTokens, '--title')
  const description = readRequiredDescription(commandTokens)
  const problem = readRequiredOption(commandTokens, '--problem')
  const acceptanceCriteria = readRequiredOption(commandTokens, '--acceptance-criteria')
  const keyChanges = readRequiredOption(commandTokens, '--key-changes')
  const architectureImpact = readRequiredOption(commandTokens, '--architecture-impact')
  const validation = readRequiredOption(commandTokens, '--validation')
  const notes = readRequiredOption(commandTokens, '--notes')
  return buildPullRequestDescriptionInput({
    title,
    description,
    problem,
    acceptanceCriteria,
    keyChanges,
    architectureImpact,
    validation,
    notes,
  })
}

function buildPullRequestDescriptionInput(
  optionValueResults: PullRequestOptionValueResults,
): PullRequestOptionParseResult {
  const optionResults = Object.values(optionValueResults)
  const failedOptionResult = optionResults.find((optionResult) => !optionResult.ok)
  if (failedOptionResult !== undefined && !failedOptionResult.ok) {
    return {
      ok: false,
      reason: failedOptionResult.reason,
    }
  }
  return {
    ok: true,
    input: {
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

/**
 * @riviere-role domain-service
 * @riviere-role-justification PLACEHOLDER: Added before justification rule introduced.
 */
export function buildPullRequestCreationRequest(
  input: PullRequestDescriptionInput,
  githubIssue: number,
  branch: string,
): Parameters<import('./ports/create-pull-request').CreateWorkflowPullRequest>[0] {
  return {
    branch,
    title: input.title,
    body: [
      '[main-agent]',
      formatSection('Description', input.description),
      formatSection('Linked Issue', `Closes #${githubIssue}`),
      formatSection('What Problem Does This PR Solve?', input.problem),
      formatSection('Acceptance Criteria', input.acceptanceCriteria),
      formatSection('Key Changes', input.keyChanges),
      formatSection('Notable Architectural Changes / Impact', input.architectureImpact),
      formatSection('Validation', input.validation),
      formatSection('Notes', input.notes),
    ].join('\n\n'),
  }
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

function readRequiredDescription(commandTokens: readonly string[]): OptionValueResult {
  const description = readRequiredOption(commandTokens, '--description')
  if (!description.ok) {
    return description
  }
  if (description.value.length < MINIMUM_PULL_REQUEST_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      reason: `Expected --description to be at least ${MINIMUM_PULL_REQUEST_DESCRIPTION_LENGTH} characters.`,
    }
  }
  return description
}

function formatSection(heading: string, content: string): string {
  return [`## ${heading}`, content].join('\n\n')
}
