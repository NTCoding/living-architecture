import {
  render, screen, waitFor
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  describe, expect, it, vi
} from 'vitest'
import { FileUpload } from './FileUpload'
import {
  dropFilesOnElement, triggerDragOver, triggerDragLeave, isBrowserEnv, getDropZone
} from '@/test/setup'

type OnFileLoaded = (content: string, filename: string) => void
type OnError = (error: string) => void

describe('FileUpload', () => {
  it('renders upload area with instructions', () => {
    render(<FileUpload onFileLoaded={vi.fn<OnFileLoaded>()} onError={vi.fn<OnError>()} />)

    const dropText = screen.getByText(/drop your rivière graph here/i)
    expect(dropText).toBeInTheDocument()
    const browseText = screen.getByText(/click to browse/i)
    expect(browseText).toBeInTheDocument()
    const button = screen.getByRole('button', { name: /select file/i })
    expect(button).toBeInTheDocument()
  })

  it('shows drag-over state when file dragged over', () => {
    render(<FileUpload onFileLoaded={vi.fn<OnFileLoaded>()} onError={vi.fn<OnError>()} />)

    const dropZone = getDropZone()

    expect(dropZone.className).toContain('border-dashed')
    expect(dropZone.className).not.toContain('bg-[var(--primary)]/5')

    triggerDragOver(dropZone)
    expect(dropZone.className).toContain('bg-[var(--primary)]/5')

    triggerDragLeave(dropZone)
    expect(dropZone.className).not.toContain('bg-[var(--primary)]/5')
  })

  it('calls onFileLoaded with content when valid JSON dropped', async () => {
    const onFileLoaded = vi.fn<OnFileLoaded>()
    const onError = vi.fn<OnError>()
    const jsonContent = '{"version": "1.0"}'

    render(<FileUpload onFileLoaded={onFileLoaded} onError={onError} />)

    const dropZone = getDropZone()

    await dropFilesOnElement(dropZone, [
      {
        name: 'graph.json',
        content: jsonContent,
        type: 'application/json' 
      },
    ])

    await waitFor(() => {
      expect(onFileLoaded).toHaveBeenCalledWith(jsonContent, 'graph.json')
    })
    expect(onError).not.toHaveBeenCalled()
  })

  it('calls onError when non-JSON file dropped', async () => {
    const onFileLoaded = vi.fn<OnFileLoaded>()
    const onError = vi.fn<OnError>()

    render(<FileUpload onFileLoaded={onFileLoaded} onError={onError} />)

    const dropZone = getDropZone()

    await dropFilesOnElement(dropZone, [
      {
        name: 'data.txt',
        content: 'not json',
        type: 'text/plain' 
      },
    ])

    expect(onError).toHaveBeenCalledWith('Please upload a JSON file')
    expect(onFileLoaded).not.toHaveBeenCalled()
  })

  it('triggers file input when button clicked', async () => {
    const user = userEvent.setup()

    render(<FileUpload onFileLoaded={vi.fn<OnFileLoaded>()} onError={vi.fn<OnError>()} />)

    const fileInput = document.querySelector('input[type="file"]')
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new TypeError('File input not found')
    }
    const clickSpy = vi.spyOn(fileInput, 'click')

    const button = screen.getByRole('button', { name: /select file/i })
    await user.click(button)

    expect(clickSpy).toHaveBeenCalled()
  })

  it('has accessible file input with label', () => {
    render(<FileUpload onFileLoaded={vi.fn<OnFileLoaded>()} onError={vi.fn<OnError>()} />)

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toHaveAttribute('aria-label', 'Upload file')
  })

  it('button is keyboard accessible', async () => {
    const user = userEvent.setup()

    render(<FileUpload onFileLoaded={vi.fn<OnFileLoaded>()} onError={vi.fn<OnError>()} />)

    const button = screen.getByRole('button', { name: /select file/i })
    const fileInput = document.querySelector('input[type="file"]')
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new TypeError('File input not found')
    }
    const clickSpy = vi.spyOn(fileInput, 'click')

    button.focus()
    expect(button).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(clickSpy).toHaveBeenCalled()
  })

  describe.skipIf(isBrowserEnv)('FileReader error handling (jsdom only)', () => {
    it('calls onError when FileReader fails', async () => {
      const onFileLoaded = vi.fn<OnFileLoaded>()
      const onError = vi.fn<OnError>()

      class MockFileReader {
        result: string | null = null
        onload: ((event: { target: { result: string } }) => void) | null = null
        onerror: (() => void) | null = null
        readAsText(): void {
          this.onerror?.()
        }
      }
      vi.stubGlobal('FileReader', MockFileReader)

      render(<FileUpload onFileLoaded={onFileLoaded} onError={onError} />)

      const dropZone = getDropZone()
      await dropFilesOnElement(dropZone, [
        {
          name: 'graph.json',
          content: '{}',
          type: 'application/json' 
        },
      ])

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Failed to read file')
      })
      expect(onFileLoaded).not.toHaveBeenCalled()

      vi.unstubAllGlobals()
    })

    it('calls onError when FileReader returns non-string result', async () => {
      const onFileLoaded = vi.fn<OnFileLoaded>()
      const onError = vi.fn<OnError>()

      class MockFileReader {
        result: ArrayBuffer | null = null
        onload: ((event: { target: { result: ArrayBuffer | null } }) => void) | null = null
        onerror: (() => void) | null = null
        readAsText(): void {
          const buffer = new ArrayBuffer(8)
          this.result = buffer
          this.onload?.({ target: { result: buffer } })
        }
      }
      vi.stubGlobal('FileReader', MockFileReader)

      render(<FileUpload onFileLoaded={onFileLoaded} onError={onError} />)

      const dropZone = getDropZone()
      await dropFilesOnElement(dropZone, [
        {
          name: 'graph.json',
          content: '{}',
          type: 'application/json' 
        },
      ])

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Failed to read file content')
      })
      expect(onFileLoaded).not.toHaveBeenCalled()

      vi.unstubAllGlobals()
    })
  })
})
