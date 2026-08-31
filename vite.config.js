import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' prefix loads every var in .env, not just VITE_-prefixed ones — this
  // is what keeps OPENROUTER_API_KEY out of the client bundle: it's only
  // ever read here, in Node, never via import.meta.env.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'openrouter-proxy',
        // ponytail: dev-server-only proxy, so the key never ships to the
        // browser. There's no prod server in this repo yet — a real deploy
        // needs this same forwarding logic behind an actual backend/function.
        configureServer(server) {
          server.middlewares.use('/api/ai/generate', (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end('Method not allowed')
              return
            }
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', async () => {
              try {
                const { prompt } = JSON.parse(body)
                const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model: 'openrouter/free',
                    temperature: 0,
                    messages: [{ role: 'user', content: prompt }],
                  }),
                })
                const data = await upstream.text()
                res.statusCode = upstream.status
                res.setHeader('Content-Type', 'application/json')
                res.end(data)
              } catch (err) {
                res.statusCode = 502
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'AI proxy request failed' }))
              }
            })
          })
        },
      },
    ],
  }
})
