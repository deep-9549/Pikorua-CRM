import { SetMetadata } from '@nestjs/common'
import { UserRole } from '../constants/roles'

export const ROLES_KEY = 'roles'

/**
 * Restrict a route (or whole controller) to the given roles. Must be used
 * together with `RolesGuard`. Example: `@Roles('super_admin')`.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
