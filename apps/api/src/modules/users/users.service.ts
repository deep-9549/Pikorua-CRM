import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { and, eq, isNull, desc } from 'drizzle-orm'
import * as bcrypt from 'bcryptjs'
import { DatabaseService } from '../../database/database.service'
import { employees, metaLeads, userProfiles } from '@pikorua/db'
import { CreateUserDto } from './dto/create-user.dto'
import { LeadActivityService } from '../lead-activity/lead-activity.service'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

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
  constructor(
    private readonly database: DatabaseService,
    private readonly leadActivityService: LeadActivityService,
  ) {}

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
      tenantId: DEFAULT_TENANT_ID,
      fullName: dto.full_name,
      email: dto.email,
      phone: dto.phone ?? null,
      role: dto.role as never,
      passwordHash,
      status: 'active',
    }).returning()

    if (user.role === 'sales_executive') {
      await this.db.insert(employees).values({
        userId: user.id,
        tenantId: user.tenantId ?? DEFAULT_TENANT_ID,
        role: 'sales_executive',
        phoneEncrypted: user.phone,
        status: 'active',
        joinDate: new Date(),
      })
    }

    return { user: serializeUser(user) }
  }

  async remove(id: string, requesterId: string) {
    if (id === requesterId) throw new ConflictException('Cannot delete your own account')
    const user = await this.db.query.userProfiles.findFirst({ where: eq(userProfiles.id, id) })
    if (!user) throw new NotFoundException(`User ${id} not found`)

    const now = new Date()
    await this.db.transaction(async (tx) => {
      const affectedLeads = await tx.query.metaLeads.findMany({
        where: and(
          eq(metaLeads.assignedTo, id),
          eq(metaLeads.status, 'assigned'),
          isNull(metaLeads.deletedAt),
        ),
        with: { assignedToProfile: true },
      })

      // Only active assignments return to the queue. Historical/converted lead
      // states remain untouched, and all CRM detail/history rows are preserved.
      await tx
        .update(metaLeads)
        .set({
          assignedTo: null,
          assignedBy: null,
          assignedAt: null,
          status: 'unassigned',
          updatedAt: now,
        })
        .where(and(
          eq(metaLeads.assignedTo, id),
          eq(metaLeads.status, 'assigned'),
          isNull(metaLeads.deletedAt),
        ))

      for (const lead of affectedLeads) {
        await this.leadActivityService.record({
          leadId: lead.id,
          actorUserId: requesterId,
          eventType: 'unassigned',
          source: 'user_deleted',
          title: 'Lead unassigned after user deletion',
          description: 'Assigned user was deleted, so the lead returned to the unassigned queue.',
          fromUserId: id,
          fromUserName: lead.assignedToProfile?.fullName ?? user.fullName ?? user.email ?? null,
          changes: {
            assigned_to: {
              label: 'Assigned To',
              from: lead.assignedToProfile?.fullName ?? user.fullName ?? user.email ?? null,
              to: null,
            },
          },
          metadata: { deleted_user_id: id },
        }, tx)
      }

      await tx
        .update(employees)
        .set({
          status: 'inactive',
          phoneEncrypted: null,
          deletedAt: now,
          updatedAt: now,
        })
        .where(eq(employees.userId, id))

      await tx
        .delete(userProfiles)
        .where(eq(userProfiles.id, id))
    })

    return { deleted: true }
  }
}
