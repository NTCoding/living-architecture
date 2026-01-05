import {
  describe, it, expect, beforeEach, vi 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CodeLinkMenu } from './CodeLinkMenu'

const STORAGE_KEY = 'eclair-code-link-settings'

function setVSCodePath(path: string): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      vscodePath: path,
      githubOrg: null,
      githubBranch: 'main',
    }),
  )
}

function setGitHubOrg(org: string): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      vscodePath: null,
      githubOrg: org,
      githubBranch: 'main',
    }),
  )
}

describe('CodeLinkMenu', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('button', () => {
    it('renders code link button with truncated path', () => {
      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      expect(screen.getByText('src/file.ts:42')).toBeInTheDocument()
    })

    it('has code-link class for styling', () => {
      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      expect(screen.getByRole('button')).toHaveClass('code-link')
    })

    it('truncates long paths from the start', () => {
      const longPath = 'ecommerce-demo-app/shipping-domain/src/api/endpoint.ts'
      render(<CodeLinkMenu filePath={longPath} lineNumber={4} repository="test-repo" />)

      const pathSpan = screen.getByTestId('code-link-path')
      const text = pathSpan.textContent ?? ''
      expect(text.startsWith('...')).toBe(true)
      expect(text.endsWith('endpoint.ts:4')).toBe(true)
      expect(text.length).toBeLessThanOrEqual(30)
    })

    it('shows full path in title attribute for tooltip', () => {
      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('title', 'src/file.ts:42')
    })
  })

  describe('dropdown', () => {
    it('shows dropdown menu when clicked', async () => {
      const user = userEvent.setup()

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Open in VS Code')).toBeInTheDocument()
      expect(screen.getByText('Open on GitHub')).toBeInTheDocument()
      expect(screen.getByText('Copy path')).toBeInTheDocument()
    })

    it('hides dropdown when clicking outside', async () => {
      const user = userEvent.setup()

      render(
        <div>
          <CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />
          <button type="button">Outside</button>
        </div>,
      )

      await user.click(screen.getByRole('button', { name: /src\/file\.ts/ }))
      expect(screen.getByText('Open in VS Code')).toBeInTheDocument()

      await user.click(screen.getByText('Outside'))
      expect(screen.queryByText('Open in VS Code')).not.toBeInTheDocument()
    })
  })

  describe('VS Code option', () => {
    it('shows configure modal when VS Code clicked without saved path', async () => {
      const user = userEvent.setup()

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Open in VS Code'))

      expect(screen.getByText('Configure VS Code Path')).toBeInTheDocument()
    })

    it('shows saved path as hint when configured', async () => {
      setVSCodePath('/Users/test/project')
      const user = userEvent.setup()

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('/Users/test/project')).toBeInTheDocument()
    })

    it('shows gear icon to edit path when configured', async () => {
      setVSCodePath('/Users/test/project')
      const user = userEvent.setup()

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      await user.click(screen.getByRole('button'))

      expect(screen.getByTitle('Edit VS Code path')).toBeInTheDocument()
    })

    it('opens configure modal when gear icon clicked', async () => {
      setVSCodePath('/Users/test/project')
      const user = userEvent.setup()

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByTitle('Edit VS Code path'))

      expect(screen.getByText('Configure VS Code Path')).toBeInTheDocument()
      expect(screen.getByDisplayValue('/Users/test/project')).toBeInTheDocument()
    })
  })

  describe('GitHub option', () => {
    it('shows configure modal when GitHub clicked with no saved org', async () => {
      const user = userEvent.setup()

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="my-repo" />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Open on GitHub'))

      expect(screen.getByText('Configure GitHub Organization')).toBeInTheDocument()
    })

    it('shows saved org as hint when configured', async () => {
      setGitHubOrg('https://github.com/myorg')
      const user = userEvent.setup()

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="my-repo" />)

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('https://github.com/myorg')).toBeInTheDocument()
    })

    it('shows gear icon to edit org when configured', async () => {
      setGitHubOrg('https://github.com/myorg')
      const user = userEvent.setup()

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="my-repo" />)

      await user.click(screen.getByRole('button'))

      expect(screen.getByTitle('Edit GitHub URL')).toBeInTheDocument()
    })

    it('opens configure modal when gear icon clicked', async () => {
      setGitHubOrg('https://github.com/myorg')
      const user = userEvent.setup()

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="my-repo" />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByTitle('Edit GitHub URL'))

      expect(screen.getByText('Configure GitHub Organization')).toBeInTheDocument()
      expect(screen.getByDisplayValue('https://github.com/myorg')).toBeInTheDocument()
    })
  })

  describe('Copy path option', () => {
    it('copies path to clipboard when clicked', async () => {
      const user = userEvent.setup()

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Copy path'))

      const clipboardText = await navigator.clipboard.readText()
      expect(clipboardText).toBe('src/file.ts:42')
    })
  })

  describe('Modal save functionality', () => {
    it('saves VS Code path and opens URL when modal saved', async () => {
      const user = userEvent.setup()
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Open in VS Code'))

      expect(screen.getByText('Configure VS Code Path')).toBeInTheDocument()

      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, '/usr/local/bin')

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      expect(window.open).toHaveBeenCalled()
      openSpy.mockRestore()
    })

    it('saves GitHub org and opens URL when modal saved with repository', async () => {
      const user = userEvent.setup()
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="my-repo" />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Open on GitHub'))

      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, 'https://github.com/myorg')

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      expect(window.open).toHaveBeenCalled()
      openSpy.mockRestore()
    })

    it('closes dropdown after modal save', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'open').mockImplementation(() => null)

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Open in VS Code'))

      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, '/path/to/vscode')

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      expect(screen.queryByText('Copy path')).not.toBeInTheDocument()
    })
  })

  describe('GitHub with repository configured', () => {
    it('opens GitHub URL when repository and org are both configured', async () => {
      const user = userEvent.setup()
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      setGitHubOrg('https://github.com/myorg')

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="my-repo" />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Open on GitHub'))

      expect(openSpy).toHaveBeenCalled()
      openSpy.mockRestore()
    })
  })

  describe('VS Code URL opening', () => {
    it('opens VS Code URL when path is configured', async () => {
      const user = userEvent.setup()
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      setVSCodePath('/Users/test/project')

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Open in VS Code'))

      expect(openSpy).toHaveBeenCalled()
      openSpy.mockRestore()
    })
  })

  describe('Menu closes', () => {
    it('closes menu after opening VS Code', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'open').mockImplementation(() => null)

      setVSCodePath('/Users/test/project')

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      await user.click(screen.getByRole('button'))
      expect(screen.getByText('Copy path')).toBeInTheDocument()

      await user.click(screen.getByText('Open in VS Code'))

      expect(screen.queryByText('Copy path')).not.toBeInTheDocument()
    })

    it('closes menu after opening GitHub', async () => {
      const user = userEvent.setup()
      vi.spyOn(window, 'open').mockImplementation(() => null)

      setGitHubOrg('https://github.com/myorg')

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="my-repo" />)

      await user.click(screen.getByRole('button'))
      expect(screen.getByText('Copy path')).toBeInTheDocument()

      await user.click(screen.getByText('Open on GitHub'))

      expect(screen.queryByText('Copy path')).not.toBeInTheDocument()
    })

    it('closes menu after copying path', async () => {
      const user = userEvent.setup()

      render(<CodeLinkMenu filePath="src/file.ts" lineNumber={42} repository="test-repo" />)

      await user.click(screen.getByRole('button'))
      expect(screen.getByText('Copy path')).toBeInTheDocument()

      await user.click(screen.getByText('Copy path'))

      expect(screen.queryByText('Copy path')).not.toBeInTheDocument()
    })
  })
})
