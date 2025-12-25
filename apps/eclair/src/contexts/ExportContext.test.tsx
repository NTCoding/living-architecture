import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExportProvider, useExport } from './ExportContext'

function TestConsumer(): React.ReactElement {
  const { exportHandlers } = useExport()
  return (
    <div>
      <span data-testid="has-png">{exportHandlers.onPng !== null ? 'yes' : 'no'}</span>
      <span data-testid="has-svg">{exportHandlers.onSvg !== null ? 'yes' : 'no'}</span>
      <button onClick={() => exportHandlers.onPng?.()}>PNG</button>
      <button onClick={() => exportHandlers.onSvg?.()}>SVG</button>
    </div>
  )
}

function TestRegistrar({ onPng, onSvg }: { onPng?: () => void; onSvg?: () => void }): React.ReactElement {
  const { registerExportHandlers, clearExportHandlers } = useExport()

  return (
    <div>
      <button onClick={() => registerExportHandlers({ onPng: onPng ?? null, onSvg: onSvg ?? null })}>
        Register
      </button>
      <button onClick={clearExportHandlers}>Clear</button>
    </div>
  )
}

describe('ExportContext', () => {
  it('provides null handlers by default', () => {
    render(
      <ExportProvider>
        <TestConsumer />
      </ExportProvider>
    )

    expect(screen.getByTestId('has-png')).toHaveTextContent('no')
    expect(screen.getByTestId('has-svg')).toHaveTextContent('no')
  })

  it('allows registering export handlers', async () => {
    const mockPng = vi.fn()
    const mockSvg = vi.fn()

    render(
      <ExportProvider>
        <TestRegistrar onPng={mockPng} onSvg={mockSvg} />
        <TestConsumer />
      </ExportProvider>
    )

    expect(screen.getByTestId('has-png')).toHaveTextContent('no')

    act(() => {
      screen.getByText('Register').click()
    })

    expect(screen.getByTestId('has-png')).toHaveTextContent('yes')
    expect(screen.getByTestId('has-svg')).toHaveTextContent('yes')
  })

  it('calls registered handlers when invoked', () => {
    const mockPng = vi.fn()
    const mockSvg = vi.fn()

    render(
      <ExportProvider>
        <TestRegistrar onPng={mockPng} onSvg={mockSvg} />
        <TestConsumer />
      </ExportProvider>
    )

    act(() => {
      screen.getByText('Register').click()
    })

    screen.getByText('PNG').click()
    expect(mockPng).toHaveBeenCalledOnce()

    screen.getByText('SVG').click()
    expect(mockSvg).toHaveBeenCalledOnce()
  })

  it('clears handlers when clearExportHandlers called', () => {
    const mockPng = vi.fn()

    render(
      <ExportProvider>
        <TestRegistrar onPng={mockPng} />
        <TestConsumer />
      </ExportProvider>
    )

    act(() => {
      screen.getByText('Register').click()
    })
    expect(screen.getByTestId('has-png')).toHaveTextContent('yes')

    act(() => {
      screen.getByText('Clear').click()
    })
    expect(screen.getByTestId('has-png')).toHaveTextContent('no')
  })
})
