import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@pikorua/db'

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name)
  private readonly client: postgres.Sql
  readonly db: ReturnType<typeof drizzle<typeof schema>>

  constructor() {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')

    // Pool size. The old default of 1 serialized every concurrent query through
    // a single connection — disastrous when the DB is a cross-region round-trip
    // away. Default to a small pool; tune via DATABASE_MAX_CONNECTIONS to stay
    // within the provider's connection limit.
    const max = Number(process.env.DATABASE_MAX_CONNECTIONS ?? 10)

    // Prepared statements must be disabled when connecting through a transaction
    // pooler (e.g. Supabase Supavisor on port 6543 / pgBouncer transaction mode).
    // Set DATABASE_PREPARE=false for the pooler; leave unset for a direct connection.
    const prepare = process.env.DATABASE_PREPARE !== 'false'

    this.client = postgres(url, {
      ssl: process.env.DATABASE_SSL === 'true' ? 'require' : undefined,
      max,
      prepare,
      idle_timeout: Number(process.env.DATABASE_IDLE_TIMEOUT ?? 30),
      connect_timeout: Number(process.env.DATABASE_CONNECT_TIMEOUT ?? 15),
    })
    this.db = drizzle(this.client, { schema })
    this.logger.log(`Database connected (pool max=${max}, prepare=${prepare})`)
  }

  async onModuleDestroy() {
    await this.client.end()
    this.logger.log('Database connection closed')
  }
}
