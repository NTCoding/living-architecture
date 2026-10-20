import { z } from 'zod'

const CONVENTIONAL_TITLE =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9-]{1,20}\))?: \S/

const MAXIMUM_TITLE_LENGTH = 72
const MINIMUM_DESCRIPTION_LENGTH = 100

const TITLE_SCHEMA = z.string()
const DESCRIPTION_SCHEMA = z.string()

/** @riviere-role domain-error */
export class InvalidPullRequestDraft extends Error {
  constructor(reasons: readonly string[]) {
    super(`The pull request draft is not valid: ${reasons.join(' ')}`)
    this.name = 'InvalidPullRequestDraft'
  }
}

/** @riviere-role value-object */
export class PullRequestDraftValidation {
  declare private readonly brand: 'PullRequestDraftValidation'

  private constructor(private readonly validationReasons: readonly string[]) {}

  static from(reasons: readonly string[]): PullRequestDraftValidation {
    return new PullRequestDraftValidation(reasons)
  }

  isValid(): boolean {
    return this.validationReasons.length === 0
  }

  reasons(): readonly string[] {
    return this.validationReasons
  }
}

/** @riviere-role value-object */
export class PullRequestDraft {
  declare private readonly brand: 'PullRequestDraft'

  private constructor(
    private readonly draftTitle: string,
    private readonly draftDescription: string,
  ) {}

  static parse(input: { readonly title: string; readonly description: string }): PullRequestDraft {
    const draft = new PullRequestDraft(
      TITLE_SCHEMA.parse(input.title),
      DESCRIPTION_SCHEMA.parse(input.description),
    )
    const validation = draft.validate()
    if (!validation.isValid()) throw new InvalidPullRequestDraft(validation.reasons())
    return draft
  }

  title(): string {
    return this.draftTitle
  }

  description(): string {
    return this.draftDescription
  }

  validate(): PullRequestDraftValidation {
    return PullRequestDraftValidation.from(this.reasons())
  }

  private reasons(): readonly string[] {
    const reasons: string[] = []
    if (!CONVENTIONAL_TITLE.test(this.draftTitle)) {
      reasons.push('The title needs a conventional commit type, an optional scope, and a summary.')
    }
    if (this.draftTitle.length > MAXIMUM_TITLE_LENGTH) {
      reasons.push(`The title is longer than ${MAXIMUM_TITLE_LENGTH} characters.`)
    }
    if (this.draftTitle.endsWith('.')) {
      reasons.push('The title ends with a full stop.')
    }
    if (this.draftDescription.trim().length < MINIMUM_DESCRIPTION_LENGTH) {
      reasons.push(`The description is shorter than ${MINIMUM_DESCRIPTION_LENGTH} characters.`)
    }
    return reasons
  }
}
