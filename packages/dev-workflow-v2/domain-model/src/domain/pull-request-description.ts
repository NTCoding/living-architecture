import { z } from 'zod'

const CONVENTIONAL_COMMIT_TYPES = [
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
] as const

const COMMIT_TYPE_SCHEMA = z.enum(CONVENTIONAL_COMMIT_TYPES)

const MINIMUM_PULL_REQUEST_DESCRIPTION_LENGTH = 100

/** @riviere-role value-object */
export class CommitType {
  declare private readonly brand: 'CommitType'

  private constructor(private readonly commitTypeName: z.infer<typeof COMMIT_TYPE_SCHEMA>) {}

  static from(
    value: string,
  ):
    | { readonly ok: true; readonly value: CommitType }
    | { readonly ok: false; readonly reason: string } {
    const result = COMMIT_TYPE_SCHEMA.safeParse(value)
    return result.success
      ? { ok: true, value: new CommitType(result.data) }
      : {
          ok: false,
          reason: `Expected --commit-type to be one of: ${CONVENTIONAL_COMMIT_TYPES.join(', ')}.`,
        }
  }

  name(): z.infer<typeof COMMIT_TYPE_SCHEMA> {
    return this.commitTypeName
  }
}

/** @riviere-role value-object */
export class PullRequestTitle {
  declare private readonly brand: 'PullRequestTitle'

  private constructor(private readonly titleValue: string) {}

  static from(
    value: string,
  ):
    | { readonly ok: true; readonly value: PullRequestTitle }
    | { readonly ok: false; readonly reason: string } {
    if (value.trim().length === 0) {
      return { ok: false, reason: 'Expected non-empty value for --title.' }
    }
    if (value.endsWith('.')) {
      return { ok: false, reason: 'Expected --title to not end with a full stop.' }
    }
    if (value !== value.toLowerCase()) {
      return { ok: false, reason: 'Expected --title to use lower case.' }
    }
    return { ok: true, value: new PullRequestTitle(value) }
  }

  value(): string {
    return this.titleValue
  }
}

/** @riviere-role value-object */
export class PullRequestDescription {
  declare private readonly brand: 'PullRequestDescription'

  private constructor(private readonly descriptionValue: string) {}

  static from(
    value: string,
  ):
    | { readonly ok: true; readonly value: PullRequestDescription }
    | { readonly ok: false; readonly reason: string } {
    if (value.trim().length < MINIMUM_PULL_REQUEST_DESCRIPTION_LENGTH) {
      return {
        ok: false,
        reason: `Expected --description to be at least ${MINIMUM_PULL_REQUEST_DESCRIPTION_LENGTH} characters.`,
      }
    }
    return { ok: true, value: new PullRequestDescription(value) }
  }

  value(): string {
    return this.descriptionValue
  }
}

/** @riviere-role value-object */
export class PullRequestCreationDetails {
  declare private readonly brand: 'PullRequestCreationDetails'

  private constructor(
    readonly commitType: CommitType,
    readonly commitScope: string,
    readonly title: PullRequestTitle,
    readonly description: PullRequestDescription,
    readonly problem: string,
    readonly acceptanceCriteria: string,
    readonly keyChanges: string,
    readonly architectureImpact: string,
    readonly validation: string,
    readonly notes: string,
  ) {}

  static from(values: {
    readonly commitType: CommitType
    readonly commitScope: string
    readonly title: PullRequestTitle
    readonly description: PullRequestDescription
    readonly problem: string
    readonly acceptanceCriteria: string
    readonly keyChanges: string
    readonly architectureImpact: string
    readonly validation: string
    readonly notes: string
  }): PullRequestCreationDetails {
    return new PullRequestCreationDetails(
      values.commitType,
      values.commitScope,
      values.title,
      values.description,
      values.problem,
      values.acceptanceCriteria,
      values.keyChanges,
      values.architectureImpact,
      values.validation,
      values.notes,
    )
  }
}
