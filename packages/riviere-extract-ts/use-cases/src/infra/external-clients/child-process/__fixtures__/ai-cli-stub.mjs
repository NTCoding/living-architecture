const [mode, ...rest] = process.argv.slice(2)

if (mode === '--version') {
  process.stdout.write('ai-cli-stub 1.0.0\n')
} else if (mode === 'echo-stdin') {
  const chunks = []
  process.stdin.on('data', (chunk) => chunks.push(chunk))
  process.stdin.on('end', () => {
    process.stdout.write(`stdin:${Buffer.concat(chunks).toString('utf8')}`)
  })
} else if (mode === 'echo-arguments') {
  process.stdout.write(`arguments:${rest.join('|')}`)
} else if (mode === 'sleep') {
  setTimeout(() => process.stdout.write('finished'), Number(rest[0] ?? '5000'))
} else if (mode === 'large-output') {
  process.stdout.write('x'.repeat(Number(rest[0] ?? '2000000')))
} else if (mode === 'fail') {
  process.stderr.write(rest[0] ?? 'failed')
  process.exitCode = 3
} else if (mode === 'self-kill') {
  process.kill(process.pid, 'SIGKILL')
} else if (mode === 'exit-immediately') {
  process.exit(0)
} else {
  process.stderr.write(`unknown mode: ${mode}`)
  process.exitCode = 2
}
