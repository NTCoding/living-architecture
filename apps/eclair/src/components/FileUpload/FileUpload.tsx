import { useState, useCallback, useRef } from 'react'

interface FileUploadProps {
  onFileLoaded: (content: string, fileName: string) => void
  onError: (error: string) => void
  accept?: string
}

export function FileUpload({ onFileLoaded, onError, accept = '.json' }: FileUploadProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      onError('Please upload a JSON file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result
      if (typeof content === 'string') {
        onFileLoaded(content, file.name)
      } else {
        onError('Failed to read file content')
      }
    }
    reader.onerror = () => {
      onError('Failed to read file')
    }
    reader.readAsText(file)
  }, [onFileLoaded, onError])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file !== undefined) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file !== undefined) {
      handleFile(file)
    }
  }, [handleFile])

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        border-2 border-dashed rounded-[var(--radius-lg)] p-12 text-center
        transition-all duration-200
        ${isDragging
          ? 'border-[var(--primary)] bg-[var(--primary)]/5'
          : 'border-[var(--border-color)] hover:border-[var(--primary)]/50'
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload file"
      />

      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
          <i className="ph ph-upload text-3xl text-[var(--primary)]" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <p className="text-lg font-medium text-[var(--text-primary)]">
            Drop your Rivière graph here
          </p>
          <p className="text-sm text-[var(--text-tertiary)]">
            or click to browse for a JSON file
          </p>
        </div>

        <button
          onClick={handleButtonClick}
          className="
            px-6 py-2.5 rounded-[var(--radius)]
            bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)]
            text-white font-medium
            shadow-md hover:shadow-lg
            transition-all duration-200 hover:-translate-y-0.5
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]
          "
        >
          Select File
        </button>
      </div>
    </div>
  )
}
