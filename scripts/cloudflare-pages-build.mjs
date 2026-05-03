import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(scriptDir, '..')
const frontendDir = path.join(workspaceRoot, 'apps', 'frontend')

execSync('npx @cloudflare/next-on-pages --outdir ../../.cloudflare-pages', {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true
})
