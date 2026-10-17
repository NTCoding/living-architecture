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
  return `${instructions}\n${FACTORY_ADDENDUM}`
}

const FACTORY_ADDENDUM = [
  '',
  '## Running inside the software factory',
  '',
  'You are one step in a workflow. Do not post to GitHub and do not query or change workflow state.',
  'The workflow posts your findings and records your status for you.',
  'Return your verdict as structured data: a status of APPROVED or OPEN_FEEDBACK, and your findings.',
  'A finding needs the file, the line, the rule name when one applies, and what good looks like.',
].join('\n')
