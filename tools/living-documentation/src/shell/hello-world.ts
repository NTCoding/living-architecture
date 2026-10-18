#!/usr/bin/env node

/** @riviere-role main */
export function printHelloWorld(writeGreeting: (greeting: string) => void): void {
  writeGreeting('hello world')
}
