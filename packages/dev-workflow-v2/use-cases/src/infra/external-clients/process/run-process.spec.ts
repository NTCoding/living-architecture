import { runProcess } from './run-process'

it('runs the requested command with its configured environment', () => {
  expect(() =>
    runProcess({
      command: process.execPath,
      arguments: ['-e', 'process.exit(process.env.VERIFICATION_FIXTURE === "present" ? 0 : 1)'],
      environment: { VERIFICATION_FIXTURE: 'present' },
    }),
  ).not.toThrow()
})

it('reports the invocation and captured failure output when a process exits unsuccessfully', () => {
  expect(() =>
    runProcess({
      command: process.execPath,
      arguments: ['-e', 'console.log("failed assertion"); process.exit(7)'],
      environment: {},
    }),
  ).toThrow('"status":7,"signal":null,"stdout":"failed assertion\\n"')
})

it('reports a missing executable as a failure', () => {
  expect(() =>
    runProcess({ command: '/does-not-exist/verification-fixture', arguments: [], environment: {} }),
  ).toThrow('ENOENT')
})
