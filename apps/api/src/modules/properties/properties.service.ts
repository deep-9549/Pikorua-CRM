import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, isNull, and } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { properties } from '@pikorua/db'

@Injectable()
export class PropertiesService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async findAll(status?: string) {
    const conditions = [isNull(properties.deletedAt)]
    if (status) conditions.push(eq(properties.status, status as never))

    return this.db.query.properties.findMany({
      where: and(...conditions),
      with: {
        images: true,
        amenities: true,
        appreciation: true,
      },
    })
  }

  async findOne(id: string) {
    const property = await this.db.query.properties.findFirst({
      where: and(eq(properties.id, id), isNull(properties.deletedAt)),
      with: {
        images: true,
        amenities: true,
        appreciation: true,
      },
    })
    if (!property) throw new NotFoundException(`Property ${id} not found`)
    return property
  }
}
