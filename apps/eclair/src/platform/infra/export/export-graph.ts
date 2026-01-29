import { toPng } from 'html-to-image'

export const UNNAMED_GRAPH_EXPORT_NAME = 'unnamed-graph'

function formatTimestamp(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}-${hours}${minutes}${seconds}`
}

export function generateExportFilename(graphName: string, extension: 'png' | 'svg'): string {
  const sanitizedName = graphName.replaceAll(' ', '-')
  const timestamp = formatTimestamp(new Date())
  return `${sanitizedName}-${timestamp}.${extension}`
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportSvgAsFile(svg: SVGSVGElement, filename: string): void {
  const svgString = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([svgString], { type: 'image/svg+xml' })
  downloadBlob(blob, filename)
}

interface PngExportOptions {backgroundColor?: string}

export async function exportElementAsPng(
  element: HTMLElement,
  filename: string,
  options: PngExportOptions = {},
): Promise<void> {
  const dataUrl = await toPng(element, options)
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}
