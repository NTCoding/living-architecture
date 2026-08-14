import { expect, it, vi } from 'vitest'
import { runGh } from './github-cli'

it('executes GitHub CLI arguments without interpreting them in a shell', () => {
  const executeGithub = vi.fn(() => 'result')

  expect(runGh(['pr', 'view', '42'], 'custom-gh', executeGithub)).toBe('result')
  expect(executeGithub).toHaveBeenCalledWith('custom-gh', ['pr', 'view', '42'])
})
