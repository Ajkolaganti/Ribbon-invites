import type { Connect, Plugin } from 'vite'
import { handleEmail } from './emailRoute.ts'
import { loadEnvFile } from './env.ts'

function emailApi(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    loadEnvFile()
    if (await handleEmail(req, res)) return
    next()
  }
}

export function resendPlugin(): Plugin {
  return {
    name: 'ribbon-resend',
    configureServer(server) {
      server.middlewares.use(emailApi())
    },
    configurePreviewServer(server) {
      server.middlewares.use(emailApi())
    },
  }
}
