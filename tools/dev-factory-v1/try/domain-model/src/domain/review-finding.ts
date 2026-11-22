import { z } from 'zod'
import { Reviewer } from './agents/reviewer'

const FILE_PATH_SCHEMA = z.string().trim().min(1)
const LINE_NUMBER_SCHEMA = z.number().int().positive()
const SUMMARY_SCHEMA = z.string().trim().min(1)
const RULE_NAME_SCHEMA = z.string().trim().min(1)

type ReviewFindingInput = {
  readonly reviewer: Reviewer
  readonly file: string
  readonly line: number
  readonly rule: string | null
  readonly summary: string
}

/** @riviere-role value-object */
export class ReviewFinding {
  declare private readonly brand: 'ReviewFinding'

  private constructor(
    private readonly findingReviewer: Reviewer,
    private readonly findingFile: string,
    private readonly findingLine: number,
    private readonly findingRule: string | null,
    private readonly findingSummary: string,
  ) {}

  static parse(input: ReviewFindingInput): ReviewFinding {
    return new ReviewFinding(
      input.reviewer,
      FILE_PATH_SCHEMA.parse(input.file),
      LINE_NUMBER_SCHEMA.parse(input.line),
      input.rule === null ? null : RULE_NAME_SCHEMA.parse(input.rule),
      SUMMARY_SCHEMA.parse(input.summary),
    )
  }

  reviewer(): Reviewer {
    return this.findingReviewer
  }

  file(): string {
    return this.findingFile
  }

  line(): number {
    return this.findingLine
  }

  rule(): string | null {
    return this.findingRule
  }

  summary(): string {
    return this.findingSummary
  }

  body(): string {
    return this.findingRule === null
      ? this.findingSummary
      : `**${this.findingRule}** ${this.findingSummary}`
  }
}
