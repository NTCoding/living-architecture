type DecisionChoice = 'proposal' | 'alternative' | 'reply'

const CHOICES: readonly DecisionChoice[] = ['proposal', 'alternative', 'reply']

/** @riviere-role domain-error */
export class InvalidDecisionAnswer extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidDecisionAnswer'
  }
}

type DecisionAnswerFields = {
  readonly choice: string
  readonly chosen: string
  readonly reply: string | null
  readonly time: string
}

/**
 * @riviere-role value-object
 *
 * What you answered to a `:::decision` block. You either picked one of the 2 options or wrote your
 * own answer; a card with no answer is not an answer.
 */
export class DecisionAnswer {
  declare private readonly brand: 'DecisionAnswer'

  private constructor(
    private readonly picked: DecisionChoice,
    private readonly answerText: string,
    private readonly replyText: string | null,
    private readonly answeredAt: string,
  ) {}

  static from(fields: DecisionAnswerFields): DecisionAnswer {
    const choice = CHOICES.find((candidate) => candidate === fields.choice)
    if (choice === undefined) {
      throw new InvalidDecisionAnswer(`A decision answer is one of ${CHOICES.join(', ')}.`)
    }
    if (fields.chosen.trim() === '') {
      throw new InvalidDecisionAnswer('A decision answer records the text that was chosen.')
    }
    if (fields.time.trim() === '') {
      throw new InvalidDecisionAnswer('A decision answer records when it was given.')
    }
    const reply = fields.reply === null ? null : fields.reply.trim()
    if ((choice === 'reply') !== (reply !== null && reply !== '')) {
      throw new InvalidDecisionAnswer(
        'A decision answer carries your own words only when you chose to write them.',
      )
    }
    return new DecisionAnswer(choice, fields.chosen, reply, fields.time)
  }

  choice(): DecisionChoice {
    return this.picked
  }

  chosen(): string {
    return this.answerText
  }

  reply(): string | null {
    return this.replyText
  }

  time(): string {
    return this.answeredAt
  }
}
