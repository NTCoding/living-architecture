#!/usr/bin/env node

/** @riviere-role main */
import { printHelloWorld } from './hello-world'

function writeGreetingToStdout(greeting: string): void {
  console.log(greeting)
}

printHelloWorld(writeGreetingToStdout)
