import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { Request, Response } from 'express'
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
  ingestMeta(
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    if (!this.webhooksService.verifyMetaSignature(request.rawBody, signature)) {
      throw new UnauthorizedException('Invalid Meta webhook signature')
    }

    return this.webhooksService.ingestMetaLeads(body)
  }
}
