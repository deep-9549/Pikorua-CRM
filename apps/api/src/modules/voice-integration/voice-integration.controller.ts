import { Body, Controller, Get, Headers, Post, Query, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { VoiceIntegrationService } from './voice-integration.service'

@Controller('v1/voice')
export class VoiceIntegrationController {
  constructor(private readonly voiceService: VoiceIntegrationService) {}

  @Post('call-results')
  ingestCallResult(
    @Req() request: Request & { rawBody?: Buffer },
    @Res({ passthrough: true }) response: Response,
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
    @Headers('x-signature') signature?: string,
    @Headers('x-timestamp') timestamp?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.voiceService.ingestCallResult({
      authorization,
      signature,
      timestamp,
      idempotencyKey,
      requestId,
      rawBody: request.rawBody,
      body,
    }).then((result) => {
      response.status(result.statusCode)
      return result.body
    })
  }

  @Post('events')
  ingestEvent(
    @Req() request: Request & { rawBody?: Buffer },
    @Res({ passthrough: true }) response: Response,
    @Body() body: Record<string, unknown>,
    @Headers('authorization') authorization?: string,
    @Headers('x-signature') signature?: string,
    @Headers('x-timestamp') timestamp?: string,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.voiceService.ingestEvent({
      authorization,
      signature,
      timestamp,
      idempotencyKey,
      requestId,
      rawBody: request.rawBody,
      body,
    }).then((result) => {
      response.status(result.statusCode)
      return result.body
    })
  }

  @Get('dial-list')
  getDialList(
    @Headers('authorization') authorization?: string,
    @Query('campaign') campaign?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.voiceService.getDialList({ authorization, campaign, limit, cursor })
  }
}
