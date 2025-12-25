import { useState, useRef, useEffect } from 'react'
import { useCodeLinkSettings } from './useCodeLinkSettings'
import { ConfigurePathModal } from './ConfigurePathModal'

interface CodeLinkMenuProps {
  filePath: string
  lineNumber: number
  repository: string
}

type ModalMode = 'vscode' | 'github' | null

const MAX_DISPLAY_LENGTH = 30

function truncateFromStart(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return '...' + text.slice(-(maxLength - 3))
}

function getModalCurrentValue(
  modalMode: ModalMode,
  vscodePath: string | null,
  githubOrg: string | null
): string | null {
  if (modalMode === 'vscode') return vscodePath
  if (modalMode === 'github') return githubOrg
  return null
}

export function CodeLinkMenu({ filePath, lineNumber, repository }: CodeLinkMenuProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    settings,
    setVscodePath,
    setGithubOrg,
    buildVscodeUrl,
    buildGithubUrl,
  } = useCodeLinkSettings()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (menuRef.current !== null && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  function handleButtonClick(e: React.MouseEvent): void {
    e.stopPropagation()
    setIsOpen((prev) => !prev)
  }

  function handleVscodeClick(): void {
    if (settings.vscodePath === null) {
      setModalMode('vscode')
      return
    }

    const url = buildVscodeUrl(filePath, lineNumber)
    if (url !== null) {
      window.open(url, '_blank')
    }
    setIsOpen(false)
  }

  function handleGithubClick(): void {
    if (settings.githubOrg === null) {
      setModalMode('github')
      return
    }

    const url = buildGithubUrl(repository, filePath, lineNumber)
    if (url !== null) {
      window.open(url, '_blank')
    }
    setIsOpen(false)
  }

  function ignoreClipboardError(): void {
    return
  }

  function handleCopyClick(): void {
    navigator.clipboard.writeText(`${filePath}:${lineNumber}`).catch(ignoreClipboardError)
    setIsOpen(false)
  }

  function openVSCodeUrl(vscodePath: string): void {
    setVscodePath(vscodePath)
    const url = `vscode://file/${vscodePath}/${filePath}:${lineNumber}`
    window.open(url, '_blank')
  }

  function openGithubUrl(baseUrl: string): void {
    setGithubOrg(baseUrl)
    const cleanUrl = baseUrl.replace(/\/$/, '')
    const url = `${cleanUrl}/${repository}/blob/${settings.githubBranch}/${filePath}#L${lineNumber}`
    window.open(url, '_blank')
  }

  function handleModalSave(value: string): void {
    if (modalMode === 'vscode') {
      openVSCodeUrl(value)
    } else if (modalMode === 'github') {
      openGithubUrl(value)
    }
    setModalMode(null)
    setIsOpen(false)
  }

  function handleModalClose(): void {
    setModalMode(null)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="code-link code-link-responsive"
        onClick={handleButtonClick}
        title={`${filePath}:${lineNumber}`}
      >
        <i className="ph ph-code" aria-hidden="true" />
        <span className="code-link-text" data-testid="code-link-path">{truncateFromStart(`${filePath}:${lineNumber}`, MAX_DISPLAY_LENGTH)}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] py-1 shadow-lg">
          <div className="flex w-full items-center">
            <button
              type="button"
              className="flex flex-1 flex-col items-start px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              onClick={handleVscodeClick}
            >
              <div className="flex items-center gap-2">
                <i className="ph ph-code text-[var(--primary)]" aria-hidden="true" />
                <span>Open in VS Code</span>
              </div>
              {settings.vscodePath !== null && (
                <span className="ml-6 text-xs text-[var(--text-tertiary)]">
                  {settings.vscodePath}
                </span>
              )}
            </button>
            {settings.vscodePath !== null && (
              <button
                type="button"
                className="px-2 py-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={(e) => {
                  e.stopPropagation()
                  setModalMode('vscode')
                }}
                title="Edit VS Code path"
              >
                <i className="ph ph-gear" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex w-full items-center">
            <button
              type="button"
              className="flex flex-1 flex-col items-start px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
              onClick={handleGithubClick}
            >
              <div className="flex items-center gap-2">
                <i className="ph ph-github-logo text-[var(--text-secondary)]" aria-hidden="true" />
                <span>Open on GitHub</span>
              </div>
              {repository !== undefined && settings.githubOrg !== null && (
                <span className="ml-6 text-xs text-[var(--text-tertiary)]">
                  {settings.githubOrg}
                </span>
              )}
            </button>
            {repository !== undefined && settings.githubOrg !== null && (
              <button
                type="button"
                className="px-2 py-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                onClick={(e) => {
                  e.stopPropagation()
                  setModalMode('github')
                }}
                title="Edit GitHub URL"
              >
                <i className="ph ph-gear" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="my-1 border-t border-[var(--border-color)]" />

          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
            onClick={handleCopyClick}
          >
            <i className="ph ph-copy text-[var(--text-secondary)]" aria-hidden="true" />
            <span>Copy path</span>
          </button>
        </div>
      )}

      <ConfigurePathModal
        mode={modalMode === 'vscode' ? 'vscode' : 'github'}
        isOpen={modalMode !== null}
        onClose={handleModalClose}
        onSave={handleModalSave}
        currentValue={getModalCurrentValue(modalMode, settings.vscodePath, settings.githubOrg)}
      />
    </div>
  )
}
