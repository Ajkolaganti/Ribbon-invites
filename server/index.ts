import { createServer } from 'node:http'
import { handleBilling } from './billingRoute.ts'
import { handleEmail } from './emailRoute.ts'
import { loadEnvFile } from './env.ts'
import { applyCors, sendJson } from './http.ts'

loadEnvFile()

const port = Number(process.env.PORT) || 8787

const server = createServer(async (req, res) => {
  try {
    if (applyCors(req, res)) return
    const path = req.url?.split('?')[0]
    if (path === '/health' && req.method === 'GET') {
      sendJson(res, 200, { ok: true })
      return
    }
    if (await handleEmail(req, res)) return
    if (await handleBilling(req, res)) return
    sendJson(res, 404, { message: 'Not found.' })
  } catch {
    if (!res.headersSent) sendJson(res, 500, { message: 'The server hit an error.' })
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Ribbon API listening on ${port}`)
})
