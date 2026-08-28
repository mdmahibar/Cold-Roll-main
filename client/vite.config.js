import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:4100'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        events: 'events',
      },
    },
    server: {
      proxy: {
        // Browser calls "/api/..." -> Vite forwards to the Node service,
        // which then talks to SAP.
        //
        // The old "/sap" rule pointed straight at the Service Layer and
        // needed `secure: false` to survive SAP's self-signed certificate.
        // That trust decision now lives on the server (SAP_REJECT_UNAUTHORIZED),
        // in one place you control, instead of on every developer machine
        // and every store PC.
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
