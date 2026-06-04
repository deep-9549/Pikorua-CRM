import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { UserRole } from '../constants/roles'

/**
 * Enforces the roles declared with `@Roles(...)`. Relies on `JwtAuthGuard`
 * having already populated `request.user`, so always list it after the JWT
 * guard: `@UseGuards(JwtAuthGuard, RolesGuard)`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No @Roles decorator => the route is open to any authenticated user.
    if (!requiredRoles || requiredRoles.length === 0) return true

    const request = context.switchToHttp().getRequest()
    const user = request.user as { role?: string } | undefined

    if (!user?.role || !requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('You do not have permission to perform this action')
    }

    return true
  }
}
