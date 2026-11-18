import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'drizzle-kit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:local.db'
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN

export default defineConfig({
  schema: path.join(__dirname, 'src/db/schema.ts').replace(/\\/g, '/'),
  out: path.join(__dirname, 'drizzle').replace(/\\/g, '/'),
  dialect: 'turso',
  dbCredentials: {
    url,
    authToken
  }
})
