import {
  describe, it, expect, vi 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigurePathModal } from './ConfigurePathModal'

describe('ConfigurePathModal', () => {
  describe('portal rendering', () => {
    it('renders modal content at document.body level to escape overflow-hidden containers', () => {
      const { baseElement } = render(
        <div style={{ overflow: 'hidden' }}>
          <ConfigurePathModal
            mode="vscode"
            isOpen={true}
            onClose={() => {}}
            onSave={() => {}}
            currentValue={null}
          />
        </div>,
      )

      const modalBackdrop = baseElement.querySelector('[role="presentation"]')
      expect(modalBackdrop).not.toBeNull()
      expect(modalBackdrop?.parentElement).toBe(document.body)
    })
  })
  describe('vscode mode', () => {
    it('renders modal with VS Code title', () => {
      render(
        <ConfigurePathModal
          mode="vscode"
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          currentValue={null}
        />,
      )

      expect(screen.getByText('Configure VS Code Path')).toBeInTheDocument()
    })

    it('shows placeholder for local path', () => {
      render(
        <ConfigurePathModal
          mode="vscode"
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          currentValue={null}
        />,
      )

      expect(screen.getByPlaceholderText('/Users/you/code/project')).toBeInTheDocument()
    })

    it('pre-fills input with current value', () => {
      render(
        <ConfigurePathModal
          mode="vscode"
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          currentValue="/existing/path"
        />,
      )

      expect(screen.getByDisplayValue('/existing/path')).toBeInTheDocument()
    })
  })

  describe('github mode', () => {
    it('renders modal with GitHub Organization title', () => {
      render(
        <ConfigurePathModal
          mode="github"
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          currentValue={null}
        />,
      )

      expect(screen.getByText('Configure GitHub Organization')).toBeInTheDocument()
    })

    it('shows placeholder for GitHub org URL', () => {
      render(
        <ConfigurePathModal
          mode="github"
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          currentValue={null}
        />,
      )

      expect(screen.getByPlaceholderText('https://github.com/myorg')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onClose when Cancel clicked', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()

      render(
        <ConfigurePathModal
          mode="vscode"
          isOpen={true}
          onClose={onClose}
          onSave={() => {}}
          currentValue={null}
        />,
      )

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onSave with input value when Save clicked', async () => {
      const onSave = vi.fn()
      const user = userEvent.setup()

      render(
        <ConfigurePathModal
          mode="vscode"
          isOpen={true}
          onClose={() => {}}
          onSave={onSave}
          currentValue={null}
        />,
      )

      await user.type(screen.getByRole('textbox'), '/my/new/path')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      expect(onSave).toHaveBeenCalledWith('/my/new/path')
    })

    it('does not render when isOpen is false', () => {
      render(
        <ConfigurePathModal
          mode="vscode"
          isOpen={false}
          onClose={() => {}}
          onSave={() => {}}
          currentValue={null}
        />,
      )

      expect(screen.queryByText('Configure VS Code Path')).not.toBeInTheDocument()
    })

    it('disables Save button when input is empty', () => {
      render(
        <ConfigurePathModal
          mode="vscode"
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          currentValue={null}
        />,
      )

      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    })

    it('enables Save button when input has value', async () => {
      const user = userEvent.setup()

      render(
        <ConfigurePathModal
          mode="vscode"
          isOpen={true}
          onClose={() => {}}
          onSave={() => {}}
          currentValue={null}
        />,
      )

      await user.type(screen.getByRole('textbox'), '/path')

      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    })
  })
})
