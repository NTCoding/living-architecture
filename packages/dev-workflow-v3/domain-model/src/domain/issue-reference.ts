import { z } from 'zod'
import { IssueNumber } from './issue-number'

const TITLE_SCHEMA = z.string().trim().min(1)
const BODY_SCHEMA = z.string()

type IssueReferenceInput = {
  readonly number: IssueNumber
  readonly title: string
  readonly body: string
}

/** @riviere-role value-object */
export class IssueReference {
  declare private readonly brand: 'IssueReference'

  private constructor(
    private readonly issueNumber: IssueNumber,
    private readonly issueTitle: string,
    private readonly issueBody: string,
  ) {}

  static from(input: IssueReferenceInput): IssueReference {
    return new IssueReference(
      input.number,
      TITLE_SCHEMA.parse(input.title),
      BODY_SCHEMA.parse(input.body),
    )
  }

  number(): IssueNumber {
    return this.issueNumber
  }

  title(): string {
    return this.issueTitle
  }

  body(): string {
    return this.issueBody
  }
}
