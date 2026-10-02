import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { billingPlugin } from './server/billingPlugin.ts'
import { resendPlugin } from './server/emailPlugin.ts'

export default defineConfig({
  plugins: [react(), resendPlugin(), billingPlugin()],
  server: { port: 5173 },
})
