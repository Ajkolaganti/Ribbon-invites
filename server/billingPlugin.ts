import type { Connect, Plugin } from 'vite'
import { handleBilling } from './billingRoute.ts'
import { loadEnvFile } from './env.ts'

function billingApi(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    loadEnvFile()
    if (await handleBilling(req, res)) return
    next()
  }
}

export function billingPlugin(): Plugin {
  return {
    name: 'ribbon-billing',
    configureServer(server) {
      server.middlewares.use(billingApi())
    },
    configurePreviewServer(server) {
      server.middlewares.use(billingApi())
    },
  }
}
