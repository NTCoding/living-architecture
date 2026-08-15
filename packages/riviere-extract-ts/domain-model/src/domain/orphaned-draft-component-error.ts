/** @riviere-role domain-error */
export class OrphanedDraftComponentError extends Error {
  constructor(orphanedModules: string[], knownModules: string[]) {
    super(
      `Draft components reference unknown modules: [${orphanedModules.join(', ')}]. Known modules: [${knownModules.join(', ')}]`,
    )
    this.name = 'OrphanedDraftComponentError'
  }
}
