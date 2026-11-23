/**
 * @riviere-role domain-port
 *
 * @riviere-role-justification The inbox is a log rather than restored aggregate state, so nothing
 * loads it as part of an aggregate. The port carries the lines and the cursor, which are the 2
 * things the file holds, and its adapter is the only code that touches the file system.
 */
export interface InboxLog {
  appendLine(line: string): void
  readLines(): readonly string[]
  printedNumber(): number
  rememberPrinted(number: number): void
}
