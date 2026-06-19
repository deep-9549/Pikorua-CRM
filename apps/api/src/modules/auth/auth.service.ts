import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { and, eq, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { userProfiles } from '@pikorua/db'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  private get db() { return this.database.db }

  async login(dto: LoginDto) {
    const user = await this.db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.email, dto.email),
        eq(userProfiles.status, 'active'),
        isNull(userProfiles.deletedAt),
      ),
    })

    if (!user || !user.passwordHash) {
      // Log failed attempts (email only, never the password) so brute-force
      // patterns are visible. The client still gets a generic message.
      this.logger.warn(`Failed login attempt for ${dto.email}`)
      throw new UnauthorizedException('Invalid credentials')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      this.logger.warn(`Failed login attempt for ${dto.email}`)
      throw new UnauthorizedException('Invalid credentials')
    }

    this.logger.log(`User ${user.id} logged in`)

    const payload = {
      sub: user.id,
      email: user.email ?? '',
      role: user.role,
      name: user.fullName ?? '',
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.fullName, email: user.email, role: user.role },
    }
  }

  async getMe(userId: string) {
    const user = await this.db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.id, userId),
        eq(userProfiles.status, 'active'),
        isNull(userProfiles.deletedAt),
      ),
    })
    if (!user) throw new UnauthorizedException()
    return { id: user.id, name: user.fullName, email: user.email, role: user.role }
  }
}
