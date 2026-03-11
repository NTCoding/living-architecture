#!/usr/bin/env node
import { main } from './cli'

process.exitCode = main(process.argv.slice(2))
