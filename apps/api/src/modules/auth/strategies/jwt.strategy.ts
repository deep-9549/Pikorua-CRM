import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { and, eq, isNull } from 'drizzle-orm'
import { userProfiles } from '@pikorua/db'
import { DatabaseService } from '../../../database/database.service'
import { getJwtSecret } from '../../../common/config/jwt'

export interface JwtPayload {
  sub: string
  email: string
  role: string
  name: string
  iat?: number
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly database: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    })
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException()

    // Validate the account on every authenticated request so deleting or
    // deactivating a user also invalidates already-issued JWTs immediately.
    const user = await this.database.db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.id, payload.sub),
        eq(userProfiles.status, 'active'),
        isNull(userProfiles.deletedAt),
      ),
    })
    if (!user) throw new UnauthorizedException()

    // Password changes revoke every JWT issued before the change. This also
    // signs out a possibly compromised session after an email reset.
    if (
      user.passwordChangedAt &&
      (!payload.iat || payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000))
    ) {
      throw new UnauthorizedException()
    }

    return {
      id: user.id,
      email: user.email ?? '',
      role: user.role,
      name: user.fullName ?? '',
      tenantId: user.tenantId,
    }
  }
}
