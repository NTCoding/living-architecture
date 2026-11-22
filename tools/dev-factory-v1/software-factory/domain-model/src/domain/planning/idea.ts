/** @riviere-role domain-error */
export class InvalidIdea extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidIdea'
  }
}

const IDEA_STATUSES = [
  'captured',
  'exploring',
  'candidate-prd',
  'prioritised',
  'planned',
  'not-now',
] as const

type IdeaStatus = (typeof IDEA_STATUSES)[number]

const NEED_LEVELS = ['probably-needed', 'definitely-needed', 'uncertain'] as const

type NeedLevel = (typeof NEED_LEVELS)[number]

type IdeaFields = {
  readonly title: string
  readonly status: string
  readonly need: string
  readonly epic: string | null
}

/**
 * @riviere-role value-object
 *
 * An idea the factory might build one day. It carries the 4 fields that the overview board needs,
 * which are the front matter of its `idea.md`; the rest of the file is prose that the factory
 * passes through untouched.
 */
export class Idea {
  declare private readonly brand: 'Idea'

  private constructor(
    private readonly ideaTitle: string,
    private readonly ideaStatus: IdeaStatus,
    private readonly ideaNeed: NeedLevel,
    private readonly epicSlug: string | null,
  ) {}

  static from(fields: IdeaFields): Idea {
    if (fields.title.trim() === '') {
      throw new InvalidIdea('An idea has a title.')
    }
    const status = IDEA_STATUSES.find((known) => known === fields.status)
    if (status === undefined) {
      throw new InvalidIdea(`An idea status is one of ${IDEA_STATUSES.join(', ')}.`)
    }
    const need = NEED_LEVELS.find((known) => known === fields.need)
    if (need === undefined) {
      throw new InvalidIdea(`A need level is one of ${NEED_LEVELS.join(', ')}.`)
    }
    return new Idea(fields.title.trim(), status, need, fields.epic)
  }

  title(): string {
    return this.ideaTitle
  }

  status(): IdeaStatus {
    return this.ideaStatus
  }

  need(): NeedLevel {
    return this.ideaNeed
  }

  epic(): string | null {
    return this.epicSlug
  }

  startPlanning(epicSlug: string): Idea {
    if (this.ideaStatus !== 'captured') {
      throw new InvalidIdea(
        `Only a captured idea can start planning, and ${this.ideaTitle} is ${this.ideaStatus}.`,
      )
    }
    if (epicSlug.trim() === '') {
      throw new InvalidIdea('The epic that the idea starts needs a slug.')
    }
    return new Idea(this.ideaTitle, 'exploring', this.ideaNeed, epicSlug.trim())
  }

  planned(): Idea {
    if (this.epicSlug === null) {
      throw new InvalidIdea(
        `The idea ${this.ideaTitle} has no epic, so its planning cannot finish.`,
      )
    }
    return new Idea(this.ideaTitle, 'planned', this.ideaNeed, this.epicSlug)
  }

  toFields(): IdeaFields {
    return {
      title: this.ideaTitle,
      status: this.ideaStatus,
      need: this.ideaNeed,
      epic: this.epicSlug,
    }
  }
}
