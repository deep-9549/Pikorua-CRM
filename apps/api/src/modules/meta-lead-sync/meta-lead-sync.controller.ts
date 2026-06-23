import { createHash, timingSafeEqual } from 'node:crypto'
import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { MetaLeadSyncService } from './meta-lead-sync.service'

@ApiTags('Internal Integrations')
@Controller('internal/meta-leads')
export class MetaLeadSyncController {
  constructor(private readonly syncService: MetaLeadSyncService) {}

  private authorized(header: string | undefined): boolean {
    const secret = process.env.CRON_SECRET
    if (!secret || !header?.startsWith('Bearer ')) return false
    const supplied = header.slice('Bearer '.length)
    const expectedHash = createHash('sha256').update(secret).digest()
    const suppliedHash = createHash('sha256').update(supplied).digest()
    return timingSafeEqual(expectedHash, suppliedHash)
  }

  @Post('sync')
  @HttpCode(200)
  @ApiOperation({ summary: 'Run a protected Meta Lead Ads bulk-read sync' })
  sync(
    @Headers('authorization') authorization: string | undefined,
    @Query('page_id') pageId?: string,
  ) {
    if (!this.authorized(authorization)) {
      throw new UnauthorizedException('Invalid cron authorization')
    }
    return this.syncService.sync({ pageId })
  }
}
