import { z } from 'zod'

const CHECK_NAME_SCHEMA = z.string().trim().min(1)

type VerificationCheckInput = {
  readonly name: string
  readonly passed: boolean
}

/** @riviere-role value-object */
export class VerificationCheck {
  declare private readonly brand: 'VerificationCheck'

  private constructor(
    private readonly checkName: string,
    private readonly checkPassed: boolean,
  ) {}

  static from(input: VerificationCheckInput): VerificationCheck {
    return new VerificationCheck(
      CHECK_NAME_SCHEMA.parse(input.name),
      z.boolean().parse(input.passed),
    )
  }

  name(): string {
    return this.checkName
  }

  passed(): boolean {
    return this.checkPassed
  }
}

/** @riviere-role value-object */
export class VerificationResult {
  declare private readonly brand: 'VerificationResult'

  private constructor(private readonly checks: readonly VerificationCheck[]) {}

  static from(checks: readonly VerificationCheck[]): VerificationResult {
    return new VerificationResult(checks)
  }

  isGreen(): boolean {
    return this.checks.every((check) => check.passed())
  }

  failures(): readonly VerificationCheck[] {
    return this.checks.filter((check) => !check.passed())
  }
}
