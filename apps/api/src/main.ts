import 'dotenv/config'
import { RequestMethod, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Gracefully shut down on SIGTERM/SIGINT: this registers signal listeners that
  // close the HTTP server (draining in-flight requests) and fire OnModuleDestroy
  // hooks — including DatabaseService closing its connection pool. Deploys and
  // scale-downs no longer sever requests or leak DB connections.
  app.enableShutdownHooks()

  app.setGlobalPrefix('api', {
    exclude: [{ path: '', method: RequestMethod.GET }],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  })

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pikorua CRM API')
    .setDescription('NestJS backend for Pikorua CRM')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? process.env.API_PORT ?? 4000

  await app.listen(port)
  console.log(`API running on http://localhost:${port}/api`)
  console.log(`Swagger docs at http://localhost:${port}/api/docs`)
}

bootstrap()
