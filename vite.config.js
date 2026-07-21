import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Ports pinned away from 5173/4173 to avoid collisions with other local projects.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // React in its own chunk: it changes only on dependency bumps,
        // so it stays cached across app deploys (assets are immutable).
        manualChunks: { vendor: ["react", "react-dom"] },
      },
    },
  },
  server: {
    port: 5280,
    strictPort: true,
  },
  preview: {
    port: 5281,
    strictPort: true,
  },
})
