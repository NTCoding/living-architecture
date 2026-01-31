export class Reviewer {
  private static readonly DELETED_USER_PLACEHOLDER = '[deleted]'

  private constructor(private readonly login: string) {}

  static createFromGitHubLogin(login: string | null | undefined): Reviewer {
    if (!login) {
      return new Reviewer(Reviewer.DELETED_USER_PLACEHOLDER)
    }
    return new Reviewer(login)
  }

  toString(): string {
    return this.login
  }

  get value(): string {
    return this.login
  }
}
