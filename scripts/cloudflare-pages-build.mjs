import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(scriptDir, '..')
const frontendDir = path.join(workspaceRoot, 'apps', 'frontend')
const nextOnPagesCli = path.join(
  workspaceRoot,
  'node_modules',
  '@cloudflare',
  'next-on-pages',
  'bin',
  'index.js'
)

execSync(`node "${nextOnPagesCli}" --outdir=.cloudflare-pages`, {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true
})
