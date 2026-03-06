import { Command } from 'commander'

export function createHelloCommand(): Command {
  return new Command('hello').description('Say hello').action(() => {
    console.log('hello')
  })
}
