import { z } from 'zod'

const NUMBER_SCHEMA = z.number().int().positive()
const URL_SCHEMA = z.string().url()

/** @riviere-role value-object */
export class PullRequestReference {
  declare private readonly brand: 'PullRequestReference'

  private constructor(
    private readonly pullRequestNumber: number,
    private readonly pullRequestUrl: string,
  ) {}

  static from(input: { readonly number: number; readonly url: string }): PullRequestReference {
    return new PullRequestReference(NUMBER_SCHEMA.parse(input.number), URL_SCHEMA.parse(input.url))
  }

  number(): number {
    return this.pullRequestNumber
  }

  url(): string {
    return this.pullRequestUrl
  }
}
