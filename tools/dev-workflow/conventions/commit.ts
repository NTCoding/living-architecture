export function formatCommitMessage(title: string): string {
  return `${title}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`
}
