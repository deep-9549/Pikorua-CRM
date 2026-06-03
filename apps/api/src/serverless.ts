import type { INestApplication } from '@nestjs/common'
import { createNestApp } from './bootstrap'

let appPromise: Promise<INestApplication> | undefined

async function getNestApp() {
  if (!appPromise) {
    appPromise = createNestApp().then(async (app) => {
      await app.init()
      return app
    })
  }

  return appPromise
}

export async function handler(req: unknown, res: unknown) {
  const app = await getNestApp()
  const expressApp = app.getHttpAdapter().getInstance()

  return expressApp(req, res)
}
