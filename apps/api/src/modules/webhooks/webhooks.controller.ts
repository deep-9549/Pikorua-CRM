import { Controller, Get, Post, Query, Body, Res, HttpCode } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Response } from 'express'
import { WebhooksService } from './webhooks.service'

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('meta')
  @ApiOperation({ summary: 'Meta webhook verification handshake' })
  verifyMeta(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const result = this.webhooksService.verifyMeta(mode, token, challenge)
    if (result) return res.status(200).send(result)
    return res.status(403).json({ error: 'Forbidden' })
  }

  @Post('meta')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Meta lead form submissions' })
  ingestMeta(@Body() body: Record<string, unknown>) {
    return this.webhooksService.ingestMetaLeads(body)
  }
}
