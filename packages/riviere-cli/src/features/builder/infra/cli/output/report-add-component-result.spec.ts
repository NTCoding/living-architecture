import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import {
  CustomTypeNotFoundError,
  DomainNotFoundError,
  DuplicateComponentError,
  InvalidGraphFileError,
} from '../../../commands/add-component'
import {
  InvalidComponentTypeOptionError,
  InvalidLineNumberError,
} from '../input/add-component-command-input'
import {
  reportAddComponentError,
  reportGraphNotFound,
  reportSuccessfulAddComponent,
} from './report-add-component-result'
import { MockError } from '../../../../../platform/__fixtures__/command-test-fixtures'

describe('reportAddComponentResult', () => {
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined)

  beforeEach(() => {
    consoleLog.mockClear()
  })

  it('writes success output when requested', () => {
    reportSuccessfulAddComponent({ componentId: 'orders:checkout:ui:checkout-page' }, true)

    expect(consoleLog).toHaveBeenCalledOnce()
  })

  it('writes graph not found output', () => {
    reportGraphNotFound('/repo/graph.json')

    expect(consoleLog).toHaveBeenCalledOnce()
  })

  it('writes validation output for invalid line number errors', () => {
    reportAddComponentError(new InvalidLineNumberError())

    expect(consoleLog).toHaveBeenCalledOnce()
  })

  it('writes validation output for invalid graph file errors', () => {
    reportAddComponentError(new InvalidGraphFileError('/repo/graph.json'))

    expect(consoleLog).toHaveBeenCalledOnce()
  })

  it('writes output for known builder errors', () => {
    reportAddComponentError(new InvalidComponentTypeOptionError('SoapApi'))
    reportAddComponentError(new DomainNotFoundError('orders'))
    reportAddComponentError(new CustomTypeNotFoundError('BackgroundJob', []))
    reportAddComponentError(new DuplicateComponentError('orders:checkout:ui:checkout-page'))

    expect(consoleLog).toHaveBeenCalledTimes(4)
  })

  it('rethrows unknown errors', () => {
    const error = new MockError('boom')

    expect(() => reportAddComponentError(error)).toThrow(error)
  })
})
