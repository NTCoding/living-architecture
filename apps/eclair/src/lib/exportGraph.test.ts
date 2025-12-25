import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toPng } from 'html-to-image'
import { generateExportFilename, downloadBlob, exportSvgAsFile, exportElementAsPng } from './exportGraph'

describe('generateExportFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 15, 14, 30, 45))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('generates filename with graph name, timestamp, and png extension', () => {
    const result = generateExportFilename('my-graph', 'png')
    expect(result).toBe('my-graph-20240315-143045.png')
  })

  it('generates filename with svg extension', () => {
    const result = generateExportFilename('my-graph', 'svg')
    expect(result).toBe('my-graph-20240315-143045.svg')
  })

  it('replaces spaces with hyphens in graph name', () => {
    const result = generateExportFilename('My Graph Name', 'png')
    expect(result).toBe('My-Graph-Name-20240315-143045.png')
  })
})

describe('downloadBlob', () => {
  it('creates object URL, triggers download link click, and revokes URL', () => {
    const mockClick = vi.fn()
    const mockCreateObjectURL = vi.fn(() => 'blob:test-url')
    const mockRevokeObjectURL = vi.fn()

    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    })

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = mockClick
        return link
      }
      return originalCreateElement(tagName)
    })

    const blob = new Blob(['test content'], { type: 'text/plain' })
    downloadBlob(blob, 'test-file.txt')

    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url')

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sets download attribute to provided filename', () => {
    const captured: { downloadAttr: string } = { downloadAttr: '' }
    const mockCreateObjectURL = vi.fn(() => 'blob:test-url')
    const mockRevokeObjectURL = vi.fn()

    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    })

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        const originalClick = link.click.bind(link)
        link.click = () => {
          captured.downloadAttr = link.download
          originalClick()
        }
        return link
      }
      return originalCreateElement(tagName)
    })

    const blob = new Blob(['test'], { type: 'text/plain' })
    downloadBlob(blob, 'my-export.svg')

    expect(captured.downloadAttr).toBe('my-export.svg')

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
})

describe('exportSvgAsFile', () => {
  it('serializes SVG element and triggers download with correct blob type', () => {
    const captured: { blob: Blob | null; filename: string } = { blob: null, filename: '' }

    const mockCreateObjectURL = vi.fn((blob: Blob) => {
      captured.blob = blob
      return 'blob:test-url'
    })
    const mockRevokeObjectURL = vi.fn()

    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    })

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = () => {
          captured.filename = link.download
        }
        return link
      }
      return originalCreateElement(tagName)
    })

    const mockSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    mockSvg.setAttribute('width', '100')
    mockSvg.setAttribute('height', '100')
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    circle.setAttribute('r', '10')
    mockSvg.appendChild(circle)

    exportSvgAsFile(mockSvg, 'test-export.svg')

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(captured.blob).toBeInstanceOf(Blob)
    if (captured.blob !== null) {
      expect(captured.blob.type).toBe('image/svg+xml')
    }
    expect(captured.filename).toBe('test-export.svg')

    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
})

vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}))

describe('exportElementAsPng', () => {
  const originalCreateElement = document.createElement.bind(document)

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('converts element to PNG data URL and triggers download', async () => {
    const mockedToPng = vi.mocked(toPng)
    mockedToPng.mockResolvedValue('data:image/png;base64,testbase64data')

    const captured: { filename: string; href: string } = { filename: '', href: '' }

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = () => {
          captured.filename = link.download
          captured.href = link.href
        }
        return link
      }
      return originalCreateElement(tagName)
    })

    const mockElement = originalCreateElement('div')
    await exportElementAsPng(mockElement, 'test-export.png')

    expect(mockedToPng).toHaveBeenCalledWith(mockElement, {})
    expect(captured.filename).toBe('test-export.png')
    expect(captured.href).toBe('data:image/png;base64,testbase64data')
  })

  it('passes backgroundColor option to toPng when provided', async () => {
    const mockedToPng = vi.mocked(toPng)
    mockedToPng.mockResolvedValue('data:image/png;base64,testbase64data')

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        const link = originalCreateElement('a')
        link.click = vi.fn()
        return link
      }
      return originalCreateElement(tagName)
    })

    const mockElement = originalCreateElement('div')
    await exportElementAsPng(mockElement, 'test-export.png', { backgroundColor: '#1a1a24' })

    expect(mockedToPng).toHaveBeenCalledWith(mockElement, { backgroundColor: '#1a1a24' })
  })
})
