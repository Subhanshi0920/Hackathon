import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Runs the api/insight.js serverless handler under `vite dev` so local dev
// doesn't need `vercel dev`.
function devApi(mode) {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/v1/chat/completions', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/api/v1/chat/completions.js')
        const chunks = []
        for await (const c of req) chunks.push(c)
        req.body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}
        res.status = (c) => ((res.statusCode = c), res)
        res.json = (o) => res.end(JSON.stringify(o))
        res.send = (s) => res.end(s)
        await handler(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), devApi(mode)],
}))
