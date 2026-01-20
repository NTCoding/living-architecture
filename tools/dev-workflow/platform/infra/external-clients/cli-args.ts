import { WorkflowError } from '../../../errors'

export const cli = {
  parseArg(flag: string): string | undefined {
    const index = process.argv.indexOf(flag)
    if (index === -1 || index + 1 >= process.argv.length) {
      return undefined
    }
    return process.argv[index + 1]
  },

  requireArg(flag: string): string {
    const value = this.parseArg(flag)
    if (!value) {
      throw new WorkflowError(`${flag} is required`)
    }
    return value
  },

  hasFlag(flag: string): boolean {
    return process.argv.includes(flag)
  },
}
