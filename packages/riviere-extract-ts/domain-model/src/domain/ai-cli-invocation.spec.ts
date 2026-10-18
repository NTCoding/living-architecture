import { describe, expect, it } from 'vitest'
import {
  AiCliArguments,
  AiCliCommand,
  AiCliInvocation,
  AiCliPrompt,
  AiCliTimeoutSeconds,
  InvalidAiCliConfigurationError,
} from './ai-cli-invocation'

describe('AiCliCommand', () => {
  it('preserves a non-empty configured command', () => {
    const command = AiCliCommand.from('claude')

    expect(command.value).toBe('claude')
  })

  it('rejects an empty command', () => {
    expect(() => AiCliCommand.from('')).toThrowError(
      new InvalidAiCliConfigurationError("Expected a non-empty AI CLI command, got ''."),
    )
  })

  it('rejects a whitespace-only command', () => {
    expect(() => AiCliCommand.from('   ')).toThrowError(
      new InvalidAiCliConfigurationError("Expected a non-empty AI CLI command, got '   '."),
    )
  })
})

describe('AiCliPrompt', () => {
  it('preserves a non-empty prompt', () => {
    const prompt = AiCliPrompt.from('Discover missing events')

    expect(prompt.value).toBe('Discover missing events')
  })

  it('rejects an empty prompt', () => {
    expect(() => AiCliPrompt.from('')).toThrowError(
      new InvalidAiCliConfigurationError("Expected a non-empty AI CLI prompt, got ''."),
    )
  })
})

describe('AiCliTimeoutSeconds', () => {
  it('preserves a positive whole-second timeout', () => {
    const timeout = AiCliTimeoutSeconds.from(600)

    expect(timeout.seconds).toBe(600)
  })

  it('rejects a fractional timeout', () => {
    expect(() => AiCliTimeoutSeconds.from(1.5)).toThrowError(
      new InvalidAiCliConfigurationError(
        "Expected an AI CLI timeout of at least 1 whole second, got '1.5'.",
      ),
    )
  })

  it('rejects a timeout below one second', () => {
    expect(() => AiCliTimeoutSeconds.from(0)).toThrowError(
      new InvalidAiCliConfigurationError(
        "Expected an AI CLI timeout of at least 1 whole second, got '0'.",
      ),
    )
  })
})

describe('AiCliArguments', () => {
  it('passes the prompt on standard input when no argument placeholder is configured', () => {
    const argumentsValue = AiCliArguments.from(['-p'])

    const placement = argumentsValue.resolve(AiCliPrompt.from('Discover gaps'))

    expect(placement).toStrictEqual({
      kind: 'standard-input',
      arguments: ['-p'],
      stdin: 'Discover gaps',
    })
  })

  it('substitutes exactly one prompt argument and leaves standard input unused', () => {
    const argumentsValue = AiCliArguments.from(['--prompt', '{prompt}'])

    const placement = argumentsValue.resolve(AiCliPrompt.from('Discover gaps'))

    expect(placement).toStrictEqual({
      kind: 'argument',
      arguments: ['--prompt', 'Discover gaps'],
    })
  })

  it('substitutes a prompt placeholder embedded in a longer argument', () => {
    const argumentsValue = AiCliArguments.from(['--message={prompt}', '-p'])

    const placement = argumentsValue.resolve(AiCliPrompt.from('Discover gaps'))

    expect(placement).toStrictEqual({
      kind: 'argument',
      arguments: ['--message=Discover gaps', '-p'],
    })
  })

  it('accepts an empty argument list and passes the prompt on standard input', () => {
    const argumentsValue = AiCliArguments.from([])

    const placement = argumentsValue.resolve(AiCliPrompt.from('Discover gaps'))

    expect(placement).toStrictEqual({
      kind: 'standard-input',
      arguments: [],
      stdin: 'Discover gaps',
    })
  })

  it('rejects an empty argument value', () => {
    expect(() => AiCliArguments.from(['-p', ''])).toThrowError(
      new InvalidAiCliConfigurationError("Expected a non-empty AI CLI argument, got ''."),
    )
  })

  it('rejects multiple prompt placeholders across separate arguments', () => {
    expect(() => AiCliArguments.from(['{prompt}', '--prompt={prompt}'])).toThrowError(
      new InvalidAiCliConfigurationError(
        "Expected at most one '{prompt}' placeholder across AI CLI arguments, got 2.",
      ),
    )
  })

  it('rejects multiple prompt placeholders inside one argument', () => {
    expect(() => AiCliArguments.from(['{prompt}-{prompt}'])).toThrowError(
      new InvalidAiCliConfigurationError(
        "Expected at most one '{prompt}' placeholder across AI CLI arguments, got 2.",
      ),
    )
  })
})

describe('AiCliInvocation', () => {
  it('exposes the configured command and timeout with its prompt placement', () => {
    const invocation = AiCliInvocation.from({
      command: AiCliCommand.from('claude'),
      arguments: AiCliArguments.from(['-p']),
      timeoutSeconds: AiCliTimeoutSeconds.from(600),
    })

    expect(invocation.commandText()).toBe('claude')
    expect(invocation.timeoutInSeconds()).toBe(600)
    expect(invocation.resolvePrompt(AiCliPrompt.from('Discover gaps'))).toStrictEqual({
      kind: 'standard-input',
      arguments: ['-p'],
      stdin: 'Discover gaps',
    })
  })
})
