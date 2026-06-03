import { Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { employees, userProfiles } from '@pikorua/db'

@Injectable()
export class EmployeesService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async findAll() {
    const users = await this.db.query.userProfiles.findMany({
      where: and(
        eq(userProfiles.role, 'sales_executive'),
        eq(userProfiles.status, 'active'),
        isNull(userProfiles.deletedAt),
      ),
      orderBy: [userProfiles.fullName],
    })

    return {
      employees: users.map((user) => ({
        id: user.id,
        full_name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      })),
    }
  }

  async findOne(id: string) {
    const employee = await this.db.query.employees.findFirst({
      where: eq(employees.id, id),
      with: {
        user: true,
        goals: true,
        activities: true,
      },
    })
    if (!employee) throw new NotFoundException(`Employee ${id} not found`)
    return employee
  }
}
