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
    this.client = postgres(url, {
      ssl: process.env.DATABASE_SSL === 'true' ? 'require' : undefined,
      max: Number(process.env.DATABASE_MAX_CONNECTIONS ?? 1),
    })
    this.db = drizzle(this.client, { schema })
    this.logger.log('Database connected')
  }

  async onModuleDestroy() {
    await this.client.end()
    this.logger.log('Database connection closed')
  }
}
