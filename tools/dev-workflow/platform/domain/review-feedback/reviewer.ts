export const DELETED_USER_PLACEHOLDER = '[deleted]'

export class Reviewer {
  private constructor(private readonly login: string) {}

  static create(login: string | null | undefined): Reviewer {
    return new Reviewer(login ?? DELETED_USER_PLACEHOLDER)
  }

  toString(): string {
    return this.login
  }

  get value(): string {
    return this.login
  }
}
