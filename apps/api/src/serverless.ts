import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ExpressAdapter } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import express from 'express'
import type { IncomingMessage, ServerResponse } from 'http'

const expressApp = express()
let isReady = false

async function bootstrap() {
  if (isReady) return
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn'],
  })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  })
  await app.init()
  isReady = true
}

export const handler = async (req: IncomingMessage, res: ServerResponse) => {
  await bootstrap()
  expressApp(req as any, res as any)
}
