const PROMPT_PLACEHOLDER = '{prompt}'

/** @riviere-role domain-error */
export class InvalidAiCliConfigurationError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'InvalidAiCliConfigurationError'
  }
}

/** @riviere-role value-object */
export class AiCliCommand {
  declare private readonly brand: 'AiCliCommand'
  private constructor(readonly value: string) {}

  static from(value: string): AiCliCommand {
    if (value.trim().length === 0) {
      throw new InvalidAiCliConfigurationError(
        `Expected a non-empty AI CLI command, got '${value}'.`,
      )
    }
    return new AiCliCommand(value)
  }
}

/** @riviere-role value-object */
export class AiCliPrompt {
  declare private readonly brand: 'AiCliPrompt'
  private constructor(readonly value: string) {}

  static from(value: string): AiCliPrompt {
    if (value.trim().length === 0) {
      throw new InvalidAiCliConfigurationError(
        `Expected a non-empty AI CLI prompt, got '${value}'.`,
      )
    }
    return new AiCliPrompt(value)
  }
}

/** @riviere-role value-object */
export class AiCliTimeoutSeconds {
  declare private readonly brand: 'AiCliTimeoutSeconds'
  private constructor(readonly seconds: number) {}

  static from(seconds: number): AiCliTimeoutSeconds {
    if (!Number.isInteger(seconds) || seconds < 1) {
      throw new InvalidAiCliConfigurationError(
        `Expected an AI CLI timeout of at least 1 whole second, got '${seconds}'.`,
      )
    }
    return new AiCliTimeoutSeconds(seconds)
  }
}

type AiCliPromptPlacement =
  | Readonly<{ kind: 'argument'; arguments: readonly string[] }>
  | Readonly<{ kind: 'standard-input'; arguments: readonly string[]; stdin: string }>

/** @riviere-role value-object */
export class AiCliArguments {
  declare private readonly brand: 'AiCliArguments'
  private constructor(private readonly entries: readonly string[]) {}

  static from(values: readonly string[]): AiCliArguments {
    values.forEach((value) => {
      if (value.trim().length === 0) {
        throw new InvalidAiCliConfigurationError(
          `Expected a non-empty AI CLI argument, got '${value}'.`,
        )
      }
    })
    const placeholderCount = values.reduce(
      (count, value) => count + countPromptPlaceholders(value),
      0,
    )
    if (placeholderCount > 1) {
      throw new InvalidAiCliConfigurationError(
        `Expected at most one '${PROMPT_PLACEHOLDER}' placeholder across AI CLI arguments, got ${placeholderCount}.`,
      )
    }
    return new AiCliArguments([...values])
  }

  resolve(prompt: AiCliPrompt): AiCliPromptPlacement {
    const promptArgumentCount = this.entries.reduce(
      (count, value) => count + countPromptPlaceholders(value),
      0,
    )
    if (promptArgumentCount === 0) {
      return { kind: 'standard-input', arguments: [...this.entries], stdin: prompt.value }
    }
    return {
      kind: 'argument',
      arguments: this.entries.map((value) => value.replaceAll(PROMPT_PLACEHOLDER, prompt.value)),
    }
  }
}

/** @riviere-role value-object */
export class AiCliInvocation {
  declare private readonly brand: 'AiCliInvocation'
  private constructor(
    private readonly command: AiCliCommand,
    private readonly argumentsValue: AiCliArguments,
    private readonly timeout: AiCliTimeoutSeconds,
  ) {}

  static from(input: {
    readonly command: AiCliCommand
    readonly arguments: AiCliArguments
    readonly timeoutSeconds: AiCliTimeoutSeconds
  }): AiCliInvocation {
    return new AiCliInvocation(input.command, input.arguments, input.timeoutSeconds)
  }

  resolvePrompt(prompt: AiCliPrompt): AiCliPromptPlacement {
    return this.argumentsValue.resolve(prompt)
  }

  commandText(): string {
    return this.command.value
  }

  timeoutInSeconds(): number {
    return this.timeout.seconds
  }
}

function countPromptPlaceholders(value: string): number {
  return value.split(PROMPT_PLACEHOLDER).length - 1
}
