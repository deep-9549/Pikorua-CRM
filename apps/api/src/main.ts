import { createNestApp } from './bootstrap'

async function bootstrap() {
  const app = await createNestApp()
  const port = process.env.API_PORT ?? 4000

  await app.listen(port)
  console.log(`API running on http://localhost:${port}/api`)
  console.log(`Swagger docs at http://localhost:${port}/api/docs`)
}

bootstrap()
