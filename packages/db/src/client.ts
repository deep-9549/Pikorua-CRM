import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required')
}

const queryClient = postgres(connectionString, {
  ssl: process.env.DATABASE_SSL === 'true' ? 'require' : undefined,
})

export const db = drizzle(queryClient, { schema })

export type Database = typeof db
