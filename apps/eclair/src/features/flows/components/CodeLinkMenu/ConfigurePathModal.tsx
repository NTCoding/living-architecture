import { useState } from 'react'
import { createPortal } from 'react-dom'

type ConfigureMode = 'vscode' | 'github' | 'github-full'

interface ConfigurePathModalProps {
  mode: ConfigureMode
  isOpen: boolean
  onClose: () => void
  onSave: (value: string) => void
  currentValue: string | null
}

const CONFIG = {
  vscode: {
    title: 'Configure VS Code Path',
    placeholder: '/Users/you/code/project',
    description: 'Enter the local path to your project root',
  },
  github: {
    title: 'Configure GitHub Organization',
    placeholder: 'https://github.com/myorg',
    description: 'Enter the GitHub organization URL (repository is read from graph data)',
  },
  'github-full': {
    title: 'Configure GitHub URL',
    placeholder: 'https://github.com/myorg/myrepo',
    description: 'Enter the full GitHub repository URL (no repository in graph data)',
  },
}

interface ModalContentProps {
  readonly mode: ConfigureMode
  readonly onClose: () => void
  readonly onSave: (value: string) => void
  readonly currentValue: string | null
}

function deriveInitialInputValue(currentValue: string | null): string {
  if (currentValue === null) {
    return ''
  }
  return currentValue
}

function ModalContent({
 mode, onClose, onSave, currentValue 
}: Readonly<ModalContentProps>): React.ReactElement {
  const [inputValue, setInputValue] = useState(() => deriveInitialInputValue(currentValue))
  const config = CONFIG[mode]

  function handleSave(): void {
    onSave(inputValue)
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2
          id="modal-title"
          className="mb-2 text-lg font-semibold text-[var(--text-primary)]"
        >
          {config.title}
        </h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          {config.description}
        </p>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={config.placeholder}
          className="mb-4 w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none"
          autoFocus
        />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={inputValue.trim() === ''}
            className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConfigurePathModal({
  mode,
  isOpen,
  onClose,
  onSave,
  currentValue,
}: ConfigurePathModalProps): React.ReactElement | null {
  if (!isOpen) {
    return null
  }

  return createPortal(
    <ModalContent
      key={`${mode}-${isOpen}`}
      mode={mode}
      onClose={onClose}
      onSave={onSave}
      currentValue={currentValue}
    />,
    document.body
  )
}
