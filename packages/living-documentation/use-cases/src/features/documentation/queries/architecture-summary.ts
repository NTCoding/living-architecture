/** @riviere-role query-model */
export class ArchitectureSummary {
  private constructor(
    readonly markdown: string,
    readonly outputPath: string,
  ) {}

  static fromMarkdown(markdown: string, outputPath: string): ArchitectureSummary {
    return new ArchitectureSummary(markdown, outputPath)
  }
}
