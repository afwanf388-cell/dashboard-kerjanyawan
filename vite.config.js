import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Biarkan console.log untuk debug jika ada error
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Gabungkan vendor menjadi satu chunk saja untuk kestabilan
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
})
