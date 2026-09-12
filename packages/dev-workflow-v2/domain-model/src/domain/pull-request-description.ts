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

const COMMIT_SCOPE_SCHEMA = z
  .string()
  .max(20)
  .refine((value) => value.trim().length > 0)
  .refine((value) => !value.includes('\n') && !value.includes('\r'))

const MINIMUM_PULL_REQUEST_DESCRIPTION_LENGTH = 100

type CommitTypeFailure = {
  readonly ok: false
  readonly type: 'unsupported-commit-type'
  readonly supportedNames: readonly z.infer<typeof COMMIT_TYPE_SCHEMA>[]
}

type CommitScopeFailure = {
  readonly ok: false
  readonly type: 'invalid-commit-scope'
}

type PullRequestTitleFailure =
  | { readonly ok: false; readonly type: 'empty-pull-request-title' }
  | { readonly ok: false; readonly type: 'pull-request-title-ends-with-full-stop' }
  | { readonly ok: false; readonly type: 'pull-request-title-has-uppercase' }

type PullRequestDescriptionFailure = {
  readonly ok: false
  readonly type: 'pull-request-description-too-short'
}

type PullRequestCreationDetailsInput = {
  readonly commitType: string
  readonly commitScope: string
  readonly title: string
  readonly description: string
  readonly problem: string
  readonly acceptanceCriteria: string
  readonly keyChanges: string
  readonly architectureImpact: string
  readonly validation: string
  readonly notes: string
}

type PullRequestCreationDetailsFailure =
  | CommitTypeFailure
  | CommitScopeFailure
  | PullRequestTitleFailure
  | PullRequestDescriptionFailure
  | { readonly ok: false; readonly type: 'composed-title-too-long' }

/** @riviere-role value-object */
export class CommitType {
  declare private readonly brand: 'CommitType'

  private constructor(private readonly commitTypeName: z.infer<typeof COMMIT_TYPE_SCHEMA>) {}

  static from(
    value: string,
  ): { readonly ok: true; readonly value: CommitType } | CommitTypeFailure {
    const result = COMMIT_TYPE_SCHEMA.safeParse(value)
    return result.success
      ? { ok: true, value: new CommitType(result.data) }
      : { ok: false, type: 'unsupported-commit-type', supportedNames: CONVENTIONAL_COMMIT_TYPES }
  }

  name(): z.infer<typeof COMMIT_TYPE_SCHEMA> {
    return this.commitTypeName
  }

  static supportedNames(): readonly z.infer<typeof COMMIT_TYPE_SCHEMA>[] {
    return CONVENTIONAL_COMMIT_TYPES
  }
}

/** @riviere-role value-object */
export class CommitScope {
  declare private readonly brand: 'CommitScope'

  private constructor(private readonly scopeValue: z.infer<typeof COMMIT_SCOPE_SCHEMA>) {}

  static from(
    value: string,
  ): { readonly ok: true; readonly value: CommitScope } | CommitScopeFailure {
    const result = COMMIT_SCOPE_SCHEMA.safeParse(value)
    return result.success
      ? { ok: true, value: new CommitScope(result.data) }
      : { ok: false, type: 'invalid-commit-scope' }
  }

  value(): string {
    return this.scopeValue
  }
}

/** @riviere-role value-object */
export class PullRequestTitle {
  declare private readonly brand: 'PullRequestTitle'

  private constructor(private readonly titleValue: string) {}

  static from(
    value: string,
  ): { readonly ok: true; readonly value: PullRequestTitle } | PullRequestTitleFailure {
    if (value.trim().length === 0) {
      return { ok: false, type: 'empty-pull-request-title' }
    }
    if (value.endsWith('.')) {
      return { ok: false, type: 'pull-request-title-ends-with-full-stop' }
    }
    if (value !== value.toLowerCase()) {
      return { ok: false, type: 'pull-request-title-has-uppercase' }
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
  ): { readonly ok: true; readonly value: PullRequestDescription } | PullRequestDescriptionFailure {
    if (value.trim().length < MINIMUM_PULL_REQUEST_DESCRIPTION_LENGTH) {
      return { ok: false, type: 'pull-request-description-too-short' }
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
    readonly commitScope: CommitScope,
    readonly title: PullRequestTitle,
    readonly description: PullRequestDescription,
    readonly problem: string,
    readonly acceptanceCriteria: string,
    readonly keyChanges: string,
    readonly architectureImpact: string,
    readonly validation: string,
    readonly notes: string,
  ) {}

  static from(
    input: PullRequestCreationDetailsInput,
  ):
    | { readonly ok: true; readonly value: PullRequestCreationDetails }
    | PullRequestCreationDetailsFailure {
    const commitType = CommitType.from(input.commitType)
    if (!commitType.ok) return commitType
    const commitScope = CommitScope.from(input.commitScope)
    if (!commitScope.ok) return commitScope
    const title = PullRequestTitle.from(input.title)
    if (!title.ok) return title
    const description = PullRequestDescription.from(input.description)
    if (!description.ok) return description
    if (`${commitType.value.name()}(${commitScope.value.value()}): ${input.title}`.length > 100) {
      return { ok: false, type: 'composed-title-too-long' }
    }
    return {
      ok: true,
      value: new PullRequestCreationDetails(
        commitType.value,
        commitScope.value,
        title.value,
        description.value,
        input.problem,
        input.acceptanceCriteria,
        input.keyChanges,
        input.architectureImpact,
        input.validation,
        input.notes,
      ),
    }
  }
}
