import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const force = process.argv.includes('--force')

const paths = {
  rootExample: resolve(rootDir, '.env.example'),
  rootEnv: resolve(rootDir, '.env'),
  apiEnv: resolve(rootDir, 'apps/api/.env'),
  webEnv: resolve(rootDir, 'apps/web/.env.local'),
}

function parseEnv(content) {
  const values = new Map()

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const equalsAt = line.indexOf('=')
    if (equalsAt === -1) continue

    const key = line.slice(0, equalsAt).trim()
    let value = line.slice(equalsAt + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    values.set(key, value)
  }

  return values
}

function getEnvContent() {
  if (existsSync(paths.rootEnv)) return readFileSync(paths.rootEnv, 'utf8')

  const jwtSecret = randomBytes(32).toString('hex')
  const webhookToken = randomBytes(24).toString('hex')
  const cronSecret = randomBytes(24).toString('hex')

  return readFileSync(paths.rootExample, 'utf8')
    .replaceAll('change-me-in-production-use-a-long-random-string', jwtSecret)
    .replaceAll('change-me-in-production', jwtSecret)
    .replaceAll('<your-verify-token>', webhookToken)
    .replaceAll('<your-random-webhook-verify-token>', webhookToken)
    .replaceAll('<a-random-secret-of-at-least-16-characters>', cronSecret)
}

function writeFileIfAllowed(filePath, content, label) {
  if (existsSync(filePath) && !force) {
    console.log(`kept ${label}: ${filePath}`)
    return
  }

  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, content.replace(/\r?\n/g, '\n'), 'utf8')
  console.log(`${existsSync(filePath) && force ? 'updated' : 'created'} ${label}: ${filePath}`)
}

const rootEnvContent = getEnvContent()
const env = parseEnv(rootEnvContent)

const jwtSecret =
  env.get('JWT_SECRET') ||
  randomBytes(32).toString('hex')
const apiBaseUrl =
  env.get('NEXT_PUBLIC_API_BASE_URL') ||
  env.get('API_BASE_URL') ||
  'http://localhost:4000'

const webEnvContent = [
  '# Local Next.js env. JWT_SECRET must match apps/api/.env.',
  `JWT_SECRET=${jwtSecret}`,
  `NEXT_PUBLIC_API_BASE_URL=${apiBaseUrl}`,
  '',
].join('\n')

writeFileIfAllowed(paths.rootEnv, rootEnvContent, 'root env')
writeFileIfAllowed(paths.apiEnv, rootEnvContent, 'API env')
writeFileIfAllowed(paths.webEnv, webEnvContent, 'web env')

console.log('')
console.log('Local env files are ready.')
console.log('Use --force to regenerate files, but only if you are okay overwriting local secrets.')
