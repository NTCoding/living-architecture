import { screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { describe, expect, it, beforeEach } from 'vitest'
import {
  capturedExternalLinks,
  mockGraphWithExternals,
  renderFullGraphPage,
  renderFullGraphPageWithExternals,
  resetCapturedCallbacks,
} from './FullGraphPage-fixtures'

describe('FullGraphPage filters', () => {
  beforeEach(resetCapturedCallbacks)

  describe('focused domain feature', () => {
    it('does not display focused domain banner when no domain focused', () => {
      renderFullGraphPage()
      expect(screen.queryByTestId('focused-domain-banner')).toBeNull()
    })

    it('displays stats panel when no domain focused', () => {
      renderFullGraphPage()
      expect(screen.getByTestId('stats-panel')).not.toBeNull()
      expect(screen.getByText('Full Graph')).not.toBeNull()
    })

    it('displays focused domain banner when domain is selected', async () => {
      const user = userEvent.setup()
      renderFullGraphPage()
      await user.click(screen.getByTestId('filter-toggle'))
      await user.click(screen.getByTestId('domain-checkbox-orders'))
      expect(screen.getByTestId('focused-domain-banner').textContent).toContain('orders')
    })

    it('displays correct node count in focused domain banner', async () => {
      const user = userEvent.setup()
      renderFullGraphPage()
      await user.click(screen.getByTestId('filter-toggle'))
      await user.click(screen.getByTestId('domain-checkbox-orders'))
      expect(screen.getByText('2 nodes')).not.toBeNull()
    })

    it('hides stats panel when domain is focused', async () => {
      const user = userEvent.setup()
      renderFullGraphPage()
      await user.click(screen.getByTestId('filter-toggle'))
      await user.click(screen.getByTestId('domain-checkbox-orders'))
      expect(screen.queryByTestId('stats-panel')).toBeNull()
    })

    it('clears focus when Clear focus button clicked', async () => {
      const user = userEvent.setup()
      renderFullGraphPage()
      await user.click(screen.getByTestId('filter-toggle'))
      await user.click(screen.getByTestId('domain-checkbox-shipping'))
      expect(screen.getByTestId('focused-domain-banner')).not.toBeNull()
      await user.click(screen.getByRole('button', { name: 'Clear focus' }))
      expect(screen.queryByTestId('focused-domain-banner')).toBeNull()
      expect(screen.getByTestId('stats-panel')).not.toBeNull()
    })

    it('toggles domain focus on second click', async () => {
      const user = userEvent.setup()
      renderFullGraphPage()
      await user.click(screen.getByTestId('filter-toggle'))
      const domainCheckbox = screen.getByTestId('domain-checkbox-orders')
      await user.click(domainCheckbox)
      expect(screen.getByTestId('focused-domain-banner')).not.toBeNull()
      await user.click(domainCheckbox)
      expect(screen.queryByTestId('focused-domain-banner')).toBeNull()
    })

    it('passes focusedDomain prop to ForceGraph when domain selected', async () => {
      const user = userEvent.setup()
      renderFullGraphPage()
      await user.click(screen.getByTestId('filter-toggle'))
      await user.click(screen.getByTestId('domain-checkbox-orders'))
      expect(screen.getByTestId('force-graph-container')).not.toBeNull()
    })
  })

  describe('node type filters', () => {
    it('toggles node type visibility when checkbox clicked', async () => {
      const user = userEvent.setup()
      renderFullGraphPage()
      await user.click(screen.getByTestId('filter-toggle'))
      expect(screen.getByTestId('filter-panel')).not.toBeNull()
      await user.click(screen.getByTestId('node-type-checkbox-API'))
      expect(screen.getByText('2 nodes')).not.toBeNull()
    })

    it('restores node type visibility when checkbox clicked again', async () => {
      const user = userEvent.setup()
      renderFullGraphPage()
      await user.click(screen.getByTestId('filter-toggle'))
      const apiCheckbox = screen.getByTestId('node-type-checkbox-API')
      await user.click(apiCheckbox)
      expect(screen.getByText('2 nodes')).not.toBeNull()
      await user.click(apiCheckbox)
      expect(screen.getByText('3 nodes')).not.toBeNull()
    })

    it('hides all node types when Hide All clicked', async () => {
      const user = userEvent.setup()
      renderFullGraphPage()
      await user.click(screen.getByTestId('filter-toggle'))
      await user.click(screen.getByTestId('node-type-filters-hide-all'))
      expect(screen.getByText('0 nodes')).not.toBeNull()
    })

    it('shows all node types when Show All clicked after hiding', async () => {
      const user = userEvent.setup()
      renderFullGraphPage()
      await user.click(screen.getByTestId('filter-toggle'))
      await user.click(screen.getByTestId('node-type-filters-hide-all'))
      expect(screen.getByText('0 nodes')).not.toBeNull()
      await user.click(screen.getByTestId('node-type-filters-show-all'))
      expect(screen.getByText('3 nodes')).not.toBeNull()
    })
  })

  describe('external node type filtering', () => {
    it('shows External in node type filters when graph has external links', async () => {
      const user = userEvent.setup()
      renderFullGraphPageWithExternals()
      await user.click(screen.getByTestId('filter-toggle'))
      expect(screen.getByTestId('node-type-checkbox-External')).not.toBeNull()
    })

    it('shows correct count for External node type', async () => {
      const user = userEvent.setup()
      renderFullGraphPageWithExternals()
      await user.click(screen.getByTestId('filter-toggle'))
      expect(screen.getByTestId('node-type-checkbox-External').closest('label')?.textContent).toContain('1')
    })

    it('does not show External in filters when graph has no external links', async () => {
      const user = userEvent.setup()
      renderFullGraphPage()
      await user.click(screen.getByTestId('filter-toggle'))
      expect(screen.queryByTestId('node-type-checkbox-External')).toBeNull()
    })

    it('unchecks External checkbox when clicked', async () => {
      const user = userEvent.setup()
      renderFullGraphPageWithExternals()
      await user.click(screen.getByTestId('filter-toggle'))
      const externalCheckbox = screen.getByTestId('node-type-checkbox-External')
      expect(externalCheckbox).toHaveProperty('checked', true)
      await user.click(externalCheckbox)
      expect(externalCheckbox).toHaveProperty('checked', false)
    })

    it('removes and restores external links when External visibility changes', async () => {
      const user = userEvent.setup()
      renderFullGraphPageWithExternals()
      await user.click(screen.getByTestId('filter-toggle'))
      const externalCheckbox = screen.getByTestId('node-type-checkbox-External')
      expect(capturedExternalLinks()).toStrictEqual(mockGraphWithExternals.externalLinks)
      await user.click(externalCheckbox)
      expect(capturedExternalLinks()).toStrictEqual([])
      await user.click(externalCheckbox)
      expect(capturedExternalLinks()).toStrictEqual(mockGraphWithExternals.externalLinks)
    })
  })
})
