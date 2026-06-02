import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { eq, isNull } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { userProfiles } from '@pikorua/db'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  private get db() { return this.database.db }

  async login(dto: LoginDto) {
    const user = await this.db.query.userProfiles.findFirst({
      where: eq(userProfiles.email, dto.email),
    })

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is inactive')
    }

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
      where: eq(userProfiles.id, userId),
    })
    if (!user) throw new UnauthorizedException()
    return { id: user.id, name: user.fullName, email: user.email, role: user.role }
  }
}
