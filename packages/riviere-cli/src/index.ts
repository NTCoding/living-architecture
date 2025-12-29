#!/usr/bin/env node
import { createProgram } from './cli';

export * from './cli';
export * from './error-codes';
export * from './output';

const program = createProgram();
program.parse();
