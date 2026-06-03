import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { eq, isNull, desc } from 'drizzle-orm'
import * as bcrypt from 'bcryptjs'
import { DatabaseService } from '../../database/database.service'
import { userProfiles } from '@pikorua/db'
import { CreateUserDto } from './dto/create-user.dto'

type UserProfile = Omit<typeof userProfiles.$inferSelect, 'passwordHash'>

function serializeUser(user: UserProfile) {
  return {
    id: user.id,
    full_name: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async findAll() {
    const users = await this.db.query.userProfiles.findMany({
      where: isNull(userProfiles.deletedAt),
      columns: { passwordHash: false },
      orderBy: [desc(userProfiles.createdAt)],
    })

    return { users: users.map(serializeUser) }
  }

  async create(dto: CreateUserDto) {
    const existing = await this.db.query.userProfiles.findFirst({
      where: eq(userProfiles.email, dto.email),
    })
    if (existing) throw new ConflictException('Email already in use')

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const [user] = await this.db.insert(userProfiles).values({
      fullName: dto.full_name,
      email: dto.email,
      phone: dto.phone ?? null,
      role: dto.role as never,
      passwordHash,
      status: 'active',
    }).returning()

    return { user: serializeUser(user) }
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) throw new ConflictException('Cannot delete your own account')
    const user = await this.db.query.userProfiles.findFirst({ where: eq(userProfiles.id, id) })
    if (!user) throw new NotFoundException(`User ${id} not found`)
    await this.db.update(userProfiles).set({ deletedAt: new Date() }).where(eq(userProfiles.id, id))
    return { deleted: true }
  }
}
