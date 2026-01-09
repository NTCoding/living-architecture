import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'
import {
  fireEvent, screen 
} from '@testing-library/react'

expect.extend(matchers)

export const isBrowserEnv =
  typeof window !== 'undefined' &&
  typeof DataTransfer !== 'undefined' &&
  DataTransfer.name === 'DataTransfer'

export function dropFilesOnElement(
  element: HTMLElement,
  files: Array<{
    name: string
    content: string
    type: string
  }>,
): void {
  const dataTransfer = new DataTransfer()
  for (const f of files) {
    dataTransfer.items.add(new File([f.content], f.name, { type: f.type }))
  }

  if (isBrowserEnv) {
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    })
    element.dispatchEvent(dropEvent)
  } else {
    fireEvent.drop(element, { dataTransfer })
  }
}

/**
 * Triggers a drag-over event on the specified element.
 * @param element - The HTML element to trigger the drag-over event on
 */
export function triggerDragOver(element: HTMLElement): void {
  fireEvent.dragOver(element)
}

/**
 * Triggers a drag-leave event on the specified element.
 * @param element - The HTML element to trigger the drag-leave event on
 */
export function triggerDragLeave(element: HTMLElement): void {
  fireEvent.dragLeave(element)
}

/**
 * Locates and returns the file drop zone element in the UI.
 * @returns The drop zone HTML element
 * @throws {Error} When the drop zone cannot be found in the DOM
 * @throws {TypeError} When the located element is not an HTMLElement
 */
export function getDropZone(): HTMLElement {
  const dropZone = screen
    .getByRole('button', { name: /select file/i })
    .closest('div[class*="border-"]')
  if (dropZone === null) {
    throw new Error('Drop zone not found')
  }
  if (!(dropZone instanceof HTMLElement)) {
    throw new TypeError('Drop zone is not an HTMLElement')
  }
  return dropZone
}

class JsdomTransferItemList {
  private items: JsdomTransferItem[] = []
  private fileList: File[] = []

  get length(): number {
    return this.items.length
  }

  add(input: string | File, type?: string): JsdomTransferItem | null {
    if (input instanceof File) {
      const item = new JsdomTransferItem('file', input.type, input)
      this.items.push(item)
      this.fileList.push(input)
      return item
    }
    if (type !== undefined) {
      const item = new JsdomTransferItem('string', type, input)
      this.items.push(item)
      return item
    }
    return null
  }

  remove(index: number): void {
    const item = this.items[index]
    if (item?.kind === 'file') {
      const file = item.getAsFile()
      if (file !== null) {
        const fileIndex = this.fileList.indexOf(file)
        if (fileIndex !== -1) {
          this.fileList.splice(fileIndex, 1)
        }
      }
    }
    this.items.splice(index, 1)
  }

  clear(): void {
    this.items = []
    this.fileList = []
  }

  getFiles(): File[] {
    return this.fileList
  }

  [Symbol.iterator](): Iterator<JsdomTransferItem> {
    return this.items[Symbol.iterator]()
  }
}

class JsdomTransferItem {
  readonly kind: 'string' | 'file'
  readonly type: string
  private content: string | File

  constructor(kind: 'string' | 'file', type: string, content: string | File) {
    this.kind = kind
    this.type = type
    this.content = content
  }

  getAsString(callback: (text: string) => void): void {
    if (this.kind === 'string' && typeof this.content === 'string') {
      callback(this.content)
    }
  }

  getAsFile(): File | null {
    if (this.kind === 'file' && this.content instanceof File) {
      return this.content
    }
    return null
  }
}

class JsdomTransfer {
  readonly items = new JsdomTransferItemList()
  dropEffect: 'none' | 'copy' | 'link' | 'move' = 'none'
  effectAllowed:
    | 'none'
    | 'copy'
    | 'copyLink'
    | 'copyMove'
    | 'link'
    | 'linkMove'
    | 'move'
    | 'all'
    | 'uninitialized' = 'uninitialized'

  private typeMap = new Map<string, string>()

  get files(): FileList {
    const files = this.items.getFiles()
    return createFileList(files)
  }

  get types(): readonly string[] {
    const types = new Set<string>()
    for (const item of this.items) {
      types.add(item.type)
    }
    if (this.items.getFiles().length > 0) {
      types.add('Files')
    }
    return Array.from(types)
  }

  clearFormat(format?: string): void {
    if (format === undefined) {
      this.typeMap.clear()
      this.items.clear()
      return
    }
    this.typeMap.delete(format)
  }

  getFormat(format: string): string {
    return this.typeMap.get(format) ?? ''
  }

  setFormat(format: string, text: string): void {
    this.typeMap.set(format, text)
  }

  setDragImage(): void {
    return
  }

  clearData(format?: string): void {
    this.clearFormat(format)
  }

  getData(format: string): string {
    return this.getFormat(format)
  }

  setData(format: string, text: string): void {
    this.setFormat(format, text)
  }
}

function createFileList(files: File[]): FileList {
  const fileList: Record<number | string, unknown> = {
    length: files.length,
    item: (index: number): File | null => files[index] ?? null,
    [Symbol.iterator]: function* (): Iterator<File> {
      for (const file of files) {
        yield file
      }
    },
  }
  files.forEach((file, index) => {
    Object.defineProperty(fileList, index, {
      value: file,
      enumerable: true,
    })
  })
  // @ts-expect-error -- FileList is a complex type that can't be fully typed
  return fileList
}

function installPolyfill(): void {
  if (typeof globalThis.DataTransfer === 'undefined') {
    // @ts-expect-error -- polyfill for jsdom
    globalThis.DataTransfer = JsdomTransfer
  }
}

installPolyfill()

class ResizeObserverMock {
  observe(): void {
    return
  }
  unobserve(): void {
    return
  }
  disconnect(): void {
    return
  }
}

globalThis.ResizeObserver = ResizeObserverMock

SVGElement.prototype.getBBox = () => ({
  x: 0,
  y: 0,
  width: 100,
  height: 20,
  top: 0,
  right: 100,
  bottom: 20,
  left: 0,
  toJSON: () => '',
})
