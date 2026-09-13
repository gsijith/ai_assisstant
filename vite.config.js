import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-only: run the /api serverless handlers under `npm run dev` (plain Vite),
// so you don't need `vercel dev`. In production Vercel serves /api natively.
function devApiPlugin() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()

        const route = req.url.split('?')[0].replace(/^\/api\//, '').replace(/\/+$/, '')
        if (!/^[a-z0-9-]+$/i.test(route)) return next() // only simple names

        // Vercel-style response helpers on top of the Node res.
        res.status = (c) => { res.statusCode = c; return res }
        res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); return res }
        res.send = (b) => { res.end(b); return res }

        // Parse JSON body (handlers expect req.body already parsed, like Vercel).
        let raw = ''
        for await (const chunk of req) raw += chunk
        try { req.body = raw ? JSON.parse(raw) : {} } catch { req.body = {} }

        try {
          const mod = await server.ssrLoadModule(`/api/${route}.js`)
          await mod.default(req, res)
        } catch (err) {
          if (err?.code === 'ERR_LOAD_URL') return next() // no such /api route
          server.config.logger.error(`[dev-api] ${route}: ${err.stack || err}`)
          if (!res.headersSent) { res.statusCode = 500; res.end(JSON.stringify({ error: String(err.message || err) })) }
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Expose non-VITE_ vars (GROQ_API_KEY, SARVAM_API_KEY, ...) to the dev API handlers.
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [react(), tailwindcss(), devApiPlugin()],
  }
})
