import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const postgres = require('postgres')
const bcrypt = require('bcryptjs')

const scriptDir = dirname(fileURLToPath(import.meta.url))
const apiDir = resolve(scriptDir, '..')
const repoRoot = resolve(scriptDir, '../../..')

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return

  for (const rawLine of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile(resolve(repoRoot, '.env'))
loadEnvFile(resolve(apiDir, '.env'))
loadEnvFile(resolve(process.cwd(), '.env'))

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://pikorua:pikorua@localhost:5432/pikorua_crm'

async function main() {
  const sql = postgres(databaseUrl)

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@pikorua.local'
  const password = process.env.SEED_ADMIN_PASSWORD || 'Pikorua@123'
  const fullName = process.env.SEED_ADMIN_FULL_NAME || 'Local Super Admin'
  const phone = process.env.SEED_ADMIN_PHONE || '9999999999'

  const passwordHash = await bcrypt.hash(password, 12)

  const existing = await sql`SELECT id FROM user_profiles WHERE email = ${email}`
  if (existing.length > 0) {
    console.log('Super admin already exists:', email)
    await sql.end()
    return
  }

  const [user] = await sql`
    INSERT INTO user_profiles (full_name, email, phone, role, password_hash, status)
    VALUES (${fullName}, ${email}, ${phone}, 'super_admin', ${passwordHash}, 'active')
    RETURNING id, email, role
  `

  console.log('Super admin created:')
  console.log('  ID:       ', user.id)
  console.log('  Email:    ', user.email)
  console.log('  Role:     ', user.role)
  console.log('  Password: ', password)

  await sql.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
