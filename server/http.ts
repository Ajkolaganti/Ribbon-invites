import type { IncomingMessage, ServerResponse } from 'node:http'

export function readBody(req: IncomingMessage, limit: number) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk))
      if (Buffer.concat(chunks).length > limit) {
        reject(new Error('The request is too long.'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

function allowedOrigins() {
  const configured = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
  const app = process.env.APP_ORIGIN?.trim().replace(/\/$/, '')
  return new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...(app ? [app] : []),
    ...configured,
  ])
}

export function frontendOrigin(req: IncomingMessage) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.replace(/\/$/, '') : ''
  if (origin && allowedOrigins().has(origin)) return origin
  return process.env.APP_ORIGIN?.trim().replace(/\/$/, '') || 'http://localhost:5173'
}

export function applyCors(req: IncomingMessage, res: ServerResponse) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.replace(/\/$/, '') : ''
  if (!origin || !allowedOrigins().has(origin)) return false
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
  res.setHeader('Access-Control-Max-Age', '86400')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return true
  }
  return false
}
