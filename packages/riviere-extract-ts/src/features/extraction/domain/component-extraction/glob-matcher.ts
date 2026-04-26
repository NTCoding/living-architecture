/** @riviere-role value-object */
export class GlobMatcher {
  declare private brand: 'GlobMatcher'
  readonly matches: (path: string, pattern: string) => boolean

  constructor(matches: (path: string, pattern: string) => boolean) {
    this.matches = matches
  }
}
