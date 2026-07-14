import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ports pinned away from 5173/4173 to avoid collisions with other local projects.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5280,
    strictPort: true,
  },
  preview: {
    port: 5281,
    strictPort: true,
  },
})
