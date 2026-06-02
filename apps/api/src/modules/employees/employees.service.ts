import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { employees } from '@pikorua/db'

@Injectable()
export class EmployeesService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  async findAll() {
    return this.db.query.employees.findMany({
      where: isNull(employees.deletedAt),
      with: {
        user: true,
        goals: true,
        activities: true,
      },
    })
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
