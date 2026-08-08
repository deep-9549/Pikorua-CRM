import { createHash, timingSafeEqual } from 'node:crypto'
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  return token || null
}

function secretsEqual(expected: string, supplied: string): boolean {
  const expectedHash = createHash('sha256').update(expected).digest()
  const suppliedHash = createHash('sha256').update(supplied).digest()
  return timingSafeEqual(expectedHash, suppliedHash)
}

function normalizeIp(value: string): string {
  return value.trim().replace(/^::ffff:/, '')
}

@Injectable()
export class HrmApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const expected = this.config.get<string>('CRM_API_KEY')?.trim()
    const supplied = bearerToken(request.headers.authorization)

    if (!expected || !supplied || !secretsEqual(expected, supplied)) {
      throw new UnauthorizedException('Invalid HRM API authorization')
    }

    const allowedIps = (this.config.get<string>('HRM_ALLOWED_IPS') ?? '')
      .split(',')
      .map(normalizeIp)
      .filter(Boolean)

    if (allowedIps.length > 0) {
      const forwarded = request.headers['x-hrm-client-ip']
      const clientIp = normalizeIp(Array.isArray(forwarded) ? forwarded[0] : forwarded ?? '')
      if (!clientIp || !allowedIps.includes(clientIp)) {
        throw new UnauthorizedException('Invalid HRM API authorization')
      }
    }

    return true
  }
}
