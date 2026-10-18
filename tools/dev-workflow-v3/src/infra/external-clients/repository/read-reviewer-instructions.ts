import { readFile } from 'node:fs/promises'

/**
 * @riviere-role external-client-service
 */
export async function readReviewerInstructions(
  repositoryRoot: string,
  reviewer: string,
): Promise<string> {
  const instructions = await readFile(
    `${repositoryRoot}/tools/dev-workflow-v2/agents/${reviewer}.md`,
    'utf8',
  )
  return `${withoutFrontmatter(instructions)}\n${FACTORY_ADDENDUM}`
}

function withoutFrontmatter(instructions: string): string {
  if (!instructions.startsWith('---')) return instructions
  const end = instructions.indexOf('\n---', 3)
  return end === -1 ? instructions : instructions.slice(end + 4).trimStart()
}

const FACTORY_ADDENDUM = [
  '',
  '## Running inside the software factory',
  '',
  'You are one step in a workflow, and you have a read-only workspace on the branch.',
  'Read files and run read-only commands such as git diff, git log, grep and ls. You cannot write.',
  'The diff under review is also in this message.',
  'Do not post to GitHub and do not query or change workflow state; the workflow does that.',
  'Return your verdict as structured data: a status of APPROVED or OPEN_FEEDBACK, and your findings.',
  'A finding needs the file, the line, the rule name when one applies, and what good looks like.',
].join('\n')
