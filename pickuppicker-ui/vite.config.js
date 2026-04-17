import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This tells Vite to actively poll for file changes
    watch: {
      usePolling: true,
    },
    // Ensures it binds to all network interfaces in Docker
    host: true,
    strictPort: true,
    port: 5173,
    allowedHosts: ['postnasal-watch-washing.ngrok-free.dev', "unnoisy-dorthy-intermeningeal.ngrok-free.dev"]
  }
})
